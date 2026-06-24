/**
 * Common Migrations File
 * Developers can add their future database migration scripts here.
 * This file is automatically executed when the backend server starts.
 */

async function runAllMigrations(pool) {
  console.log('Running automatic database migrations (JS code style)...');

  try {
    // ==========================================
    // Migration 1: Alter Businesses Table
    // ==========================================
    await pool.query(`
      ALTER TABLE businesses 
        ADD COLUMN IF NOT EXISTS average_cost NUMERIC,
        ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS dining_offers JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS menu_images JSONB DEFAULT '[]';
    `);
    console.log('Migration OK: Modified businesses table columns');

    // ==========================================
    // Migration 2: Alter Reviews Table Ratings
    // ==========================================
    await pool.query(`
      ALTER TABLE reviews
        ALTER COLUMN rating TYPE NUMERIC(3,1);
    `);
    
    // Refresh the check constraint for rating
    await pool.query(`ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;`);
    await pool.query(`ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1.0 AND rating <= 5.0);`);
    console.log('Migration OK: Updated reviews table to support half-star ratings');

    // ==========================================
    // Migration 3: Create Review Replies Table
    // ==========================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_replies (
        id SERIAL PRIMARY KEY,
        review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
        user_name VARCHAR(100) NOT NULL,
        user_type VARCHAR(20) DEFAULT 'customer' CHECK (user_type IN ('owner', 'customer')),
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Migration OK: Created review_replies table');

    // ==========================================
    // INSTRUCTIONS FOR FUTURE DEVELOPERS:
    // ==========================================
    // To add a new migration, just write a new await pool.query() block below this line.
    // Example:
    // await pool.query(`ALTER TABLE some_table ADD COLUMN some_col VARCHAR(255);`);
    
    
    console.log('All database migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    // You might want to throw the error if you want the server to fail to start upon migration failure
    // throw error; 
  }
}

module.exports = runAllMigrations;
