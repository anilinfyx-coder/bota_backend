const pool = require('./db');

async function migrate() {
  try {
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;`);
    console.log("Migration successful: added amenities to businesses table.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();
