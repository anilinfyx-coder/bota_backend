const pool = require('./db');

async function migrate() {
    try {
        await pool.query('BEGIN');

        console.log('Adding table_id to bookings...');
        await pool.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES tables(id) ON DELETE SET NULL;
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
