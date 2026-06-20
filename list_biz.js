const pool = require('./db');
async function main() {
  const r = await pool.query('SELECT id, name FROM businesses ORDER BY name LIMIT 5');
  console.log('Businesses:');
  r.rows.forEach(b => console.log(`  ${b.id} — ${b.name}`));
  await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
