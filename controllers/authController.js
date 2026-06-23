const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_reserve_key_123';

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        let customer_id;
        let customer_name;
        let customer_phone;
        if (user.role === 'customer') {
            const customerRes = await pool.query('SELECT id, name, phone FROM customers WHERE user_id = $1', [user.id]);
            if (customerRes.rows.length > 0) {
                customer_id = customerRes.rows[0].id;
                customer_name = customerRes.rows[0].name;
                customer_phone = customerRes.rows[0].phone;
            }
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, business_id: user.business_id, customer_id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                role: user.role, 
                business_id: user.business_id,
                customer_id,
                name: customer_name,
                phone: customer_phone
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.registerCustomer = async (req, res) => {
    const { name, email, phone, password } = req.body;

    try {
        // 1. Check if email already exists in users
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered.' });
        }

        // 2. Create the user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserRes = await pool.query(
            `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *`,
            [email, hashedPassword, 'customer']
        );
        const user = newUserRes.rows[0];

        // 3. Merging Logic: Check if a guest customer exists by phone
        const existingGuestRes = await pool.query('SELECT id FROM customers WHERE phone = $1', [phone]);
        let customer_id;

        if (existingGuestRes.rows.length > 0) {
            // Merge! Update the existing guest to be a registered user
            customer_id = existingGuestRes.rows[0].id;
            await pool.query(
                `UPDATE customers SET is_registered_user = true, user_id = $1, email = $2, name = $3 WHERE id = $4`,
                [user.id, email, name, customer_id]
            );
        } else {
            // Create a brand new customer profile
            const newCustomerRes = await pool.query(
                `INSERT INTO customers (name, phone, email, is_registered_user, user_id) VALUES ($1, $2, $3, true, $4) RETURNING id`,
                [name, phone, email, user.id]
            );
            customer_id = newCustomerRes.rows[0].id;
        }

        // 4. Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.role, customer_id },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1d' }
        );

        res.status(201).json({ 
            message: 'Customer registered successfully', 
            token, 
            user: { id: user.id, role: user.role, email: user.email, customer_id, name, phone } 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

exports.registerBusiness = async (req, res) => {
    // Note: In a real app, this route would be protected by middleware verifying the requester is a super_admin
    const { business_name, address, admin_email, admin_password, type_id, phone, description } = req.body;

    try {
        await pool.query('BEGIN');

        // 1. Create Business
        const bizRes = await pool.query(
            'INSERT INTO businesses (name, address, type_id, phone, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [business_name, address, type_id || null, phone || null, description || null]
        );
        const businessId = bizRes.rows[0].id;

        // 2. Create Business Admin User
        const hash = await bcrypt.hash(admin_password, 10);
        await pool.query(
            "INSERT INTO users (email, password_hash, role, business_id) VALUES ($1, $2, 'business_admin', $3)",
            [admin_email, hash, businessId]
        );

        await pool.query('COMMIT');
        
        res.status(201).json({
            message: 'Business and Admin user created successfully',
            business_id: businessId
        });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
};

exports.phoneLogin = async (req, res) => {
    const { phone, otp } = req.body;
    try {
        if (!phone || !otp) {
            return res.status(400).json({ error: 'Phone and OTP are required' });
        }
        if (otp !== '123456') {
            return res.status(401).json({ error: 'Invalid OTP' });
        }

        // Find customer by phone
        let customerRes = await pool.query('SELECT * FROM customers WHERE phone = $1', [phone]);
        let customer;
        let userId;
        let userEmail;

        if (customerRes.rows.length === 0) {
            return res.status(404).json({ error: 'Phone number not registered. Please create an account.' });
        }

        customer = customerRes.rows[0];

        if (!customer.user_id) {
            // Auto-create a user record for guest customer to upgrade to registered customer
            userEmail = `${phone.replace(/\D/g, '') || Date.now()}@bota.com`;
            // Check if user record with this email already exists
            let existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [userEmail]);
            if (existingUser.rows.length > 0) {
                userId = existingUser.rows[0].id;
            } else {
                const tempPasswordHash = await bcrypt.hash('OtpDefaultPassword123', 10);
                const newUserRes = await pool.query(
                    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'customer') RETURNING id`,
                    [userEmail, tempPasswordHash]
                );
                userId = newUserRes.rows[0].id;
            }

            // Update customer to link with this user
            await pool.query(
                `UPDATE customers SET is_registered_user = true, user_id = $1, email = $2 WHERE id = $3`,
                [userId, userEmail, customer.id]
            );
        } else {
            userId = customer.user_id;
            const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
            userEmail = userRes.rows[0]?.email || `${phone}@bota.com`;
        }

        // Generate Token
        const token = jwt.sign(
            { id: userId, role: 'customer', customer_id: customer.id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: userId,
                email: userEmail,
                role: 'customer',
                customer_id: customer.id,
                name: customer.name,
                phone: customer.phone
            }
        });
    } catch (err) {
        console.error('phoneLogin error:', err);
        res.status(500).json({ error: err.message });
    }
};
