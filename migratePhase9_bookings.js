const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Make customer_id nullable in bookings
    console.log('Making bookings.customer_id nullable...');
    await client.query(`ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL`);

    // 2. Add guests column (if not exists)
    console.log('Adding guests column to bookings...');
    await client.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guests INTEGER NOT NULL DEFAULT 2
    `);

    // 3. Add guest_name and guest_phone columns for walk-in / unregistered customers
    console.log('Adding guest_name and guest_phone columns to bookings...');
    await client.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255)
    `);
    await client.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50)
    `);

    await client.query('COMMIT');
    console.log('✅ Migration Phase 9 completed successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate();
