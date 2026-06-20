const pool = require('./db');

async function main() {
  const r = await pool.query(
    `SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'bookings' 
     ORDER BY ordinal_position`
  );
  console.log('=== BOOKINGS TABLE COLUMNS ===');
  r.rows.forEach(c => console.log(`  ${c.column_name} : ${c.data_type} (nullable: ${c.is_nullable})`));

  const r2 = await pool.query(
    `SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'customers' 
     ORDER BY ordinal_position`
  );
  console.log('\n=== CUSTOMERS TABLE COLUMNS ===');
  r2.rows.forEach(c => console.log(`  ${c.column_name} : ${c.data_type} (nullable: ${c.is_nullable})`));

  // Sample recent bookings
  const r3 = await pool.query(`SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5`);
  console.log('\n=== RECENT BOOKINGS (sample) ===');
  r3.rows.forEach(b => console.log(JSON.stringify(b)));
  
  await pool.end();
}

main().catch(e => { console.error(e.message); pool.end(); });
