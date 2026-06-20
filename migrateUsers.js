const pool = require('./db');
const bcrypt = require('bcrypt');

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'business_admin', 'customer')),
                business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Users table created.");

        // Create default super admin
        const checkAdmin = await pool.query("SELECT * FROM users WHERE email = 'admin@reserve.com'");
        if (checkAdmin.rows.length === 0) {
            const hash = await bcrypt.hash('superadmin123', 10);
            await pool.query(
                "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'super_admin')",
                ['admin@reserve.com', hash]
            );
            console.log("Default Super Admin created: admin@reserve.com / superadmin123");
        } else {
            console.log("Super Admin already exists.");
        }
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
