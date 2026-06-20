const pool = require('../db');

exports.updateSettings = async (req, res) => {
    const { id } = req.params;
    const { grace_time_minutes, online_allocation_percentage, operating_hours } = req.body;

    try {
        const result = await pool.query(
            `UPDATE businesses 
             SET grace_time_minutes = $1, online_allocation_percentage = $2, operating_hours = $3
             WHERE id = $4 RETURNING *`,
            [grace_time_minutes, online_allocation_percentage, operating_hours, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        res.json({ message: 'Settings updated successfully', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSettings = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT name, grace_time_minutes, online_allocation_percentage, phone, description, cover_image_url, operating_hours FROM businesses WHERE id = $1', [id]);
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getPublicProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT b.id, b.name, b.address, b.phone, b.description, b.cover_image_url, 
                   b.cuisine, b.rating, b.reviews_count, b.price_range, b.is_open, 
                   b.owner_id, bt.name as type_name, b.operating_hours
            FROM businesses b 
            LEFT JOIN business_types bt ON b.type_id = bt.id 
            WHERE b.id = $1
        `, [id]);
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getAllBusinesses = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.id, b.name, b.address, b.phone, b.subscription_plan, 
                   b.cover_image_url, b.cuisine, b.rating, b.reviews_count, 
                   b.price_range, b.is_open, b.owner_id, bt.name as type_name 
            FROM businesses b 
            LEFT JOIN business_types bt ON b.type_id = bt.id
        `);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getBusinessTypes = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM business_types ORDER BY name ASC');
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getTables = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM tables WHERE business_id = $1 ORDER BY table_number ASC', [id]);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.createTable = async (req, res) => {
    const { id } = req.params;
    const { table_number, capacity } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO tables (business_id, table_number, capacity) VALUES ($1, $2, $3) RETURNING *',
            [id, table_number, capacity]
        );
        res.status(201).json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.updateTableStatus = async (req, res) => {
    const { id, tableId } = req.params;
    const { is_active } = req.body;
    try {
        const result = await pool.query(
            'UPDATE tables SET is_active = $1 WHERE id = $2 AND business_id = $3 RETURNING *',
            [is_active, tableId, id]
        );
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.deleteTable = async (req, res) => {
    const { id, tableId } = req.params;
    try {
        await pool.query('DELETE FROM tables WHERE id = $1 AND business_id = $2', [tableId, id]);
        res.json({ message: 'Table deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getAnalytics = async (req, res) => {
    const { id } = req.params;
    try {
        // Total bookings
        const totalBookings = await pool.query('SELECT COUNT(*) FROM bookings WHERE business_id = $1', [id]);
        
        // Walk-in vs Online
        const sourceStats = await pool.query(`
            SELECT booking_source, COUNT(*) as count 
            FROM bookings 
            WHERE business_id = $1 
            GROUP BY booking_source
        `, [id]);

        // Status (Confirmed vs Cancelled)
        const statusStats = await pool.query(`
            SELECT status, COUNT(*) as count 
            FROM bookings 
            WHERE business_id = $1 
            GROUP BY status
        `, [id]);

        res.json({ 
            data: {
                total_bookings: parseInt(totalBookings.rows[0].count),
                sources: sourceStats.rows,
                statuses: statusStats.rows
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
