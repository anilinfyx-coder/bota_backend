const pool = require('./db');

async function seed() {
    try {
        // 1. Create a business
        const bizRes = await pool.query(
            `INSERT INTO businesses (name, address, grace_time_minutes, online_allocation_percentage) 
             VALUES ('The Sapphire Room', 'Downtown Italian', 120, 50) RETURNING id`
        );
        const bizId = bizRes.rows[0].id;

        // 2. Add 10 tables for this business (Capacity 4)
        for (let i = 1; i <= 10; i++) {
            await pool.query(
                `INSERT INTO tables (business_id, table_number, capacity) VALUES ($1, $2, 4)`,
                [bizId, `T-${i}`]
            );
        }

        // 3. Create a test customer
        const custRes = await pool.query(
            `INSERT INTO customers (name, phone, is_registered_user) VALUES ('John Doe', '555-0123', false) RETURNING id`
        );
        const custId = custRes.rows[0].id;

        console.log(`\n=== Database Seeded Successfully ===`);
        console.log(`Business ID: ${bizId}`);
        console.log(`Test Customer ID: ${custId}`);
        console.log(`10 Tables added. Total Online Allocation: 5 tables (50%).`);
        console.log(`====================================\n`);
        
    } catch (err) {
        console.error("Seeding failed:", err.message);
    } finally {
        await pool.end();
    }
}

seed();
