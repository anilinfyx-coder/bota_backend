const pool = require('../db');

// ──────────────────────────────────────────────────────────────────────────────
// CHECK AVAILABILITY
// GET /api/bookings/availability?business_id=&date=&guests=
// ──────────────────────────────────────────────────────────────────────────────
exports.checkAvailability = async (req, res) => {
    const { business_id, date, guests } = req.query;

    if (!business_id || !date || !guests) {
        return res.status(400).json({ available: false, reason: 'Missing required query params.' });
    }

    try {
        // 1. Get business settings
        const businessRes = await pool.query(
            'SELECT grace_time_minutes, online_allocation_percentage, operating_hours FROM businesses WHERE id = $1',
            [business_id]
        );
        if (businessRes.rows.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        const { grace_time_minutes, online_allocation_percentage, operating_hours } = businessRes.rows[0];

        const reqStartTime = new Date(date);
        if (isNaN(reqStartTime.getTime())) {
            return res.status(400).json({ available: false, reason: 'Invalid date format.' });
        }
        const reqEndTime = new Date(reqStartTime.getTime() + grace_time_minutes * 60000);

        // 1.5 Enforce Operating Hours
        if (operating_hours) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayOfWeek = days[reqStartTime.getDay()];
            const dayRules = operating_hours[dayOfWeek];

            if (dayRules && dayRules.closed) {
                return res.json({ available: false, reason: 'Venue is closed on this day.' });
            }

            if (dayRules && dayRules.open && dayRules.close) {
                const formatTime = (d) => d.toTimeString().substring(0, 5); // 'HH:MM'
                const reqTimeString = formatTime(reqStartTime);
                const reqEndString = formatTime(reqEndTime);

                if (reqTimeString < dayRules.open) {
                    return res.json({ available: false, reason: 'Venue is not yet open at this time.' });
                }
                if (reqEndString > dayRules.close && dayRules.close > dayRules.open) {
                    return res.json({ available: false, reason: 'Booking overlaps with venue closing time.' });
                }
            }
        }

        // 2. Count total active tables that can fit the party size
        const tablesRes = await pool.query(
            'SELECT count(*) as total_tables FROM tables WHERE business_id = $1 AND is_active = true AND capacity >= $2',
            [business_id, parseInt(guests) || 2]
        );
        const totalTablesForGuests = parseInt(tablesRes.rows[0].total_tables);

        if (totalTablesForGuests === 0) {
            return res.json({ available: false, reason: 'No tables large enough for this party size.' });
        }

        // 3. Calculate online allocation limit
        const maxOnlineBookings = Math.max(1, Math.floor(totalTablesForGuests * (online_allocation_percentage / 100)));

        // 4. Count currently overlapping confirmed bookings
        const overlapsRes = await pool.query(
            `SELECT count(*) as overlapping_bookings FROM bookings
             WHERE business_id = $1
             AND status IN ('CONFIRMED', 'ARRIVED')
             AND (
                (booking_time <= $2 AND end_time > $2) OR
                (booking_time >= $2 AND booking_time < $3)
             )`,
            [business_id, reqStartTime.toISOString(), reqEndTime.toISOString()]
        );

        const overlappingBookings = parseInt(overlapsRes.rows[0].overlapping_bookings);

        // 5. Determine availability
        if (overlappingBookings < maxOnlineBookings) {
            res.json({
                available: true,
                message: 'Table is available',
                available_tables: maxOnlineBookings - overlappingBookings
            });
        } else {
            res.json({
                available: false,
                reason: 'Online allocation limit reached for this time slot.'
            });
        }

    } catch (error) {
        console.error('checkAvailability error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET BUSINESS BOOKINGS
// GET /api/bookings/:business_id
// ──────────────────────────────────────────────────────────────────────────────
exports.getBusinessBookings = async (req, res) => {
    const { business_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT 
               b.id,
               b.business_id,
               b.booking_time,
               b.end_time,
               b.status,
               b.booking_source,
               b.guests,
               b.guest_name,
               b.guest_phone,
               b.table_id,
               t.table_number,
               -- Use direct guest fields first, fall back to customer record
               COALESCE(b.guest_name, c.name)  AS customer_name,
               COALESCE(b.guest_phone, c.phone) AS customer_phone
             FROM bookings b
             LEFT JOIN customers c ON b.customer_id = c.id
             LEFT JOIN tables   t ON b.table_id   = t.id
             WHERE b.business_id = $1
             ORDER BY b.booking_time DESC`,
            [business_id]
        );
        res.json({ data: result.rows });
    } catch (error) {
        console.error('getBusinessBookings error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// CREATE BOOKING
// POST /api/bookings
// ──────────────────────────────────────────────────────────────────────────────
exports.createBooking = async (req, res) => {
    const {
        business_id,
        customer_name,
        customer_phone,
        booking_time,
        booking_source,
        guests,
        customer_id: authCustomerId,   // optional: only sent when a registered customer is booking
    } = req.body;

    if (!business_id || !customer_name || !customer_phone || !booking_time) {
        return res.status(400).json({ error: 'Missing required fields: business_id, customer_name, customer_phone, booking_time' });
    }

    try {
        // 1. Resolve customer_id
        //    - If a registered customer_id was sent, use it directly.
        //    - Otherwise create/find a guest customer record.
        let resolvedCustomerId = authCustomerId || null;

        if (!resolvedCustomerId) {
            // Get-or-create a guest customer row (is_registered_user = false)
            let customerRes = await pool.query(
                'SELECT id FROM customers WHERE phone = $1',
                [customer_phone]
            );
            if (customerRes.rows.length === 0) {
                const newCust = await pool.query(
                    `INSERT INTO customers (name, phone, is_registered_user) VALUES ($1, $2, false) RETURNING id`,
                    [customer_name, customer_phone]
                );
                resolvedCustomerId = newCust.rows[0].id;
            } else {
                resolvedCustomerId = customerRes.rows[0].id;
            }
        }

        // 2. Fetch business settings
        const businessRes = await pool.query(
            'SELECT grace_time_minutes, operating_hours FROM businesses WHERE id = $1',
            [business_id]
        );
        if (businessRes.rows.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        const { grace_time_minutes, operating_hours } = businessRes.rows[0];
        const start = new Date(booking_time);
        if (isNaN(start.getTime())) {
            return res.status(400).json({ error: 'Invalid booking_time format.' });
        }
        const end = new Date(start.getTime() + grace_time_minutes * 60000);

        // 3. Enforce Operating Hours
        if (operating_hours) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayOfWeek = days[start.getDay()];
            const dayRules = operating_hours[dayOfWeek];

            if (dayRules && dayRules.closed) {
                return res.status(400).json({ error: 'Venue is closed on this day.' });
            }

            if (dayRules && dayRules.open && dayRules.close) {
                const formatTime = (d) => d.toTimeString().substring(0, 5);
                const reqTimeString = formatTime(start);
                const reqEndString  = formatTime(end);

                if (reqTimeString < dayRules.open) {
                    return res.status(400).json({ error: 'Venue is not yet open at this time.' });
                }
                if (reqEndString > dayRules.close && dayRules.close > dayRules.open) {
                    return res.status(400).json({ error: 'Booking overlaps with venue closing time.' });
                }
            }
        }

        // 4. Table Auto-Assignment
        //    Find the smallest available table that fits the party
        const partySize = parseInt(guests) || 2;
        const availableTablesRes = await pool.query(
            `SELECT id, table_number, capacity
             FROM tables
             WHERE business_id = $1 AND is_active = true AND capacity >= $2
             ORDER BY capacity ASC`,
            [business_id, partySize]
        );

        let assignedTableId = null;

        for (const table of availableTablesRes.rows) {
            const overlaps = await pool.query(
                `SELECT id FROM bookings
                 WHERE business_id = $1 AND table_id = $2 AND status IN ('CONFIRMED', 'ARRIVED')
                 AND ((booking_time <= $3 AND end_time > $3) OR (booking_time >= $3 AND booking_time < $4))`,
                [business_id, table.id, start.toISOString(), end.toISOString()]
            );
            if (overlaps.rows.length === 0) {
                assignedTableId = table.id;
                break;
            }
        }

        if (!assignedTableId) {
            return res.status(400).json({ error: 'No tables available for this party size at this time.' });
        }

        // 5. Insert booking — store guest_name & guest_phone directly so the record
        //    is self-contained even when the customer row is only a guest record.
        const result = await pool.query(
            `INSERT INTO bookings
               (business_id, customer_id, guest_name, guest_phone, guests,
                booking_time, end_time, status, booking_source, table_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                business_id,
                resolvedCustomerId,
                customer_name,
                customer_phone,
                partySize,
                start.toISOString(),
                end.toISOString(),
                'CONFIRMED',
                booking_source || 'ONLINE',
                assignedTableId,
            ]
        );

        res.status(201).json({
            message: 'Booking successful',
            booking_id: result.rows[0].id,
            table_assigned: assignedTableId,
        });
    } catch (error) {
        console.error('createBooking error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// CANCEL / UPDATE BOOKING STATUS
// PUT /api/bookings/:id/cancel
// ──────────────────────────────────────────────────────────────────────────────
exports.cancelBooking = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const newStatus = status || 'CANCELLED';
    try {
        const result = await pool.query(
            `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
            [newStatus, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json({ message: 'Booking status updated successfully', booking: result.rows[0] });
    } catch (error) {
        console.error('cancelBooking error:', error.message);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// GET CUSTOMER BOOKINGS
// GET /api/bookings/customer/:customer_id
// ──────────────────────────────────────────────────────────────────────────────
exports.getCustomerBookings = async (req, res) => {
    const { customer_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT b.*,
                    bus.name    AS business_name,
                    bus.address AS business_address,
                    t.table_number
             FROM bookings b
             JOIN businesses bus ON b.business_id = bus.id
             LEFT JOIN tables t  ON b.table_id    = t.id
             WHERE b.customer_id = $1
             ORDER BY b.booking_time DESC`,
            [customer_id]
        );
        res.json({ data: result.rows });
    } catch (error) {
        console.error('getCustomerBookings error:', error.message);
        res.status(500).json({ error: 'Failed to fetch customer bookings' });
    }
};
