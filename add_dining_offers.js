const pool = require('./db');

async function migrate() {
  try {
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS dining_offers JSONB DEFAULT '[]'::jsonb;`);
    console.log("Migration successful: added dining_offers to businesses table.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();
