const pool = require('./db');

async function migrate() {
    try {
        await pool.query('BEGIN');

        // 1. Create business_types Master Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS business_types (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );
        `);

        // Insert default types
        await pool.query(`
            INSERT INTO business_types (name) VALUES 
            ('Restaurant'), ('Cafe'), ('Bar'), ('Fine Dining'), ('Pub')
            ON CONFLICT DO NOTHING;
        `);

        // 2. Add new columns to businesses table safely
        const alterQueries = [
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS type_id INT REFERENCES business_types(id)",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'FREE' CHECK (subscription_plan IN ('FREE', 'PRO'))",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (subscription_status IN ('ACTIVE', 'SUSPENDED'))",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone VARCHAR(50)",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cover_image_url TEXT",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS operating_hours JSONB"
        ];

        for (const query of alterQueries) {
            await pool.query(query);
        }

        await pool.query('COMMIT');
        console.log("Phase 3 Migration completed successfully!");

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("Migration failed:", err);
    } finally {
        await pool.end();
    }
}

migrate();
