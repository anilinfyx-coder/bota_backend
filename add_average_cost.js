const pool = require('./db');

async function migrate() {
  try {
    await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS average_cost INTEGER;`);
    console.log("Migration successful: added average_cost to businesses table.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();
