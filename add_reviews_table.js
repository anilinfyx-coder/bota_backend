const pool = require('./db');

async function createReviewsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
                user_name VARCHAR(100) NOT NULL,
                rating NUMERIC(2, 1) NOT NULL,
                text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Successfully created reviews table.");
    } catch (err) {
        console.error("Error creating reviews table:", err);
    } finally {
        process.exit();
    }
}

createReviewsTable();
