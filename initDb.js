const pool = require('./db');
const ensureDatabase = require('./ensureDatabase');
const runAllMigrations = require('./migrations');

async function initDB() {
  try {
    await ensureDatabase();
    await runAllMigrations(pool);
    console.log('Database initialization completed.');
    process.exit(0);
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDB();
