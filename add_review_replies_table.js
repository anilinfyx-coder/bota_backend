const pool = require('./db');

async function createReviewRepliesTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS review_replies (
                id SERIAL PRIMARY KEY,
                review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
                user_name VARCHAR(100) NOT NULL,
                user_type VARCHAR(50) DEFAULT 'customer',
                text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("Successfully created review_replies table.");
    } catch (err) {
        console.error("Error creating review_replies table:", err);
    } finally {
        process.exit();
    }
}

createReviewRepliesTable();
