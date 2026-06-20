const pool = require('./db');

async function migrate() {
  try {
    await pool.query('BEGIN');

    // 1. Get all businesses
    const bizRes = await pool.query('SELECT id, name FROM businesses');
    const businesses = bizRes.rows;

    console.log(`Found ${businesses.length} total businesses.`);

    for (const biz of businesses) {
      // Check if this business already has tables
      const tablesRes = await pool.query('SELECT count(*) as count FROM tables WHERE business_id = $1', [biz.id]);
      const tableCount = parseInt(tablesRes.rows[0].count);

      if (tableCount === 0) {
        console.log(`Seeding tables for business "${biz.name}" (${biz.id})...`);
        
        // Define table configuration to support capacity 1-10
        const configs = [
          { number: 'T-1', capacity: 2 },
          { number: 'T-2', capacity: 2 },
          { number: 'T-3', capacity: 2 },
          { number: 'T-4', capacity: 2 },
          { number: 'T-5', capacity: 4 },
          { number: 'T-6', capacity: 4 },
          { number: 'T-7', capacity: 4 },
          { number: 'T-8', capacity: 4 },
          { number: 'T-9', capacity: 6 },
          { number: 'T-10', capacity: 6 },
          { number: 'T-11', capacity: 10 },
          { number: 'T-12', capacity: 10 }
        ];

        for (const cfg of configs) {
          await pool.query(
            'INSERT INTO tables (business_id, table_number, capacity, is_active) VALUES ($1, $2, $3, true)',
            [biz.id, cfg.number, cfg.capacity]
          );
        }
        console.log(`Added 12 tables for "${biz.name}".`);
      } else {
        console.log(`Business "${biz.name}" already has ${tableCount} tables. Skipping.`);
      }
    }

    await pool.query('COMMIT');
    console.log('Seeding of tables completed successfully!');
    process.exit(0);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
