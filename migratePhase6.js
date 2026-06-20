const pool = require('./db');

async function migrate() {
    try {
        await pool.query('BEGIN');

        console.log('Adding user_id to customers...');
        await pool.query(`
            ALTER TABLE customers 
            ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        `);

        await pool.query('COMMIT');
        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
