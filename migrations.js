/**
 * Common Migrations File
 * Developers can add their future database migration scripts here.
 * This file is automatically executed when the backend server starts.
 */

const migrationsList = [
  {
    name: 'alter_businesses_table_add_new_columns',
    run: async (pool) => {
      await pool.query(`
        ALTER TABLE businesses 
          ADD COLUMN IF NOT EXISTS average_cost NUMERIC,
          ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]',
          ADD COLUMN IF NOT EXISTS dining_offers JSONB DEFAULT '[]',
          ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]',
          ADD COLUMN IF NOT EXISTS menu_images JSONB DEFAULT '[]';
      `);
      console.log('Schema update: Modified businesses table columns');
    }
  },
  {
    name: 'alter_reviews_table_ratings_type',
    run: async (pool) => {
      await pool.query(`
        ALTER TABLE reviews
          ALTER COLUMN rating TYPE NUMERIC(3,1);
      `);
      
      // Refresh the check constraint for rating
      await pool.query(`ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;`);
      await pool.query(`ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1.0 AND rating <= 5.0);`);
      console.log('Schema update: Updated reviews table to support half-star ratings');
    }
  },
  {
    name: 'create_review_replies_table',
    run: async (pool) => {
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
      console.log('Schema update: Created review_replies table');
    }
  },
  {
    name: 'create_collections_and_moods_schemas',
    run: async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS collections (
          id SERIAL PRIMARY KEY,
          title VARCHAR(100) NOT NULL UNIQUE,
          subtitle VARCHAR(255),
          image_url TEXT,
          color_gradient VARCHAR(100),
          slug VARCHAR(100) NOT NULL UNIQUE
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS business_collections (
          business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
          collection_id INT REFERENCES collections(id) ON DELETE CASCADE,
          PRIMARY KEY (business_id, collection_id)
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS moods (
          id SERIAL PRIMARY KEY,
          title VARCHAR(100) NOT NULL UNIQUE,
          image_url TEXT,
          query_tag VARCHAR(100) NOT NULL UNIQUE
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS business_moods (
          business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
          mood_id INT REFERENCES moods(id) ON DELETE CASCADE,
          PRIMARY KEY (business_id, mood_id)
        );
      `);
      console.log('Schema update: Created Collections and Moods schemas');
    }
  },
  {
    name: 'seed_collections_and_moods_data',
    run: async (pool) => {
      const collectionsSeed = [
        { title: 'Romantic Dining', subtitle: 'Curated romantic spots', image_url: '/romantic.jpg', color_gradient: 'from-rose-900/80', slug: 'romantic-dining' },
        { title: 'Premium Dining', subtitle: 'Fine dining experiences', image_url: '/premium.jpg', color_gradient: 'from-amber-900/80', slug: 'premium-dining' },
        { title: 'Outdoor Dining', subtitle: 'Best open-air spaces', image_url: '/outdoor.jpg', color_gradient: 'from-emerald-950/80', slug: 'outdoor-dining' },
        { title: 'Quick Lunch', subtitle: 'Fast and delicious meals', image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80', color_gradient: 'from-green-900/80', slug: 'quick-lunch' },
        { title: 'Hidden Gems', subtitle: 'Secret neighborhood favorites', image_url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&q=80', color_gradient: 'from-blue-900/80', slug: 'hidden-gems' },
        { title: 'Late Night Dining', subtitle: 'Late night cravings solved', image_url: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=400&q=80', color_gradient: 'from-zinc-900/80', slug: 'late-night-dining' }
      ];

      for (const c of collectionsSeed) {
        await pool.query(`
          INSERT INTO collections (title, subtitle, image_url, color_gradient, slug)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (title) DO UPDATE 
          SET subtitle = EXCLUDED.subtitle, image_url = EXCLUDED.image_url, color_gradient = EXCLUDED.color_gradient, slug = EXCLUDED.slug;
        `, [c.title, c.subtitle, c.image_url, c.color_gradient, c.slug]);
      }

      const moodsSeed = [
        { title: 'Premium dining', image_url: '/premium.jpg', query_tag: 'Premium' },
        { title: 'Asian flavours', image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&q=80', query_tag: 'Asian' },
        { title: 'Family dining', image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&q=80', query_tag: 'Family' },
        { title: 'Buffet', image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&q=80', query_tag: 'Buffet' },
        { title: 'Pure veg', image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80', query_tag: 'Veg' },
        { title: 'Outdoor dining', image_url: '/outdoor.jpg', query_tag: 'Outdoor' },
        { title: 'Romantic dining', image_url: '/romantic.jpg', query_tag: 'Romantic' }
      ];

      for (const m of moodsSeed) {
        await pool.query(`
          INSERT INTO moods (title, image_url, query_tag)
          VALUES ($1, $2, $3)
          ON CONFLICT (title) DO UPDATE
          SET image_url = EXCLUDED.image_url, query_tag = EXCLUDED.query_tag;
        `, [m.title, m.image_url, m.query_tag]);
      }
      console.log('Data Seeding: Collections and Moods records populated');
    }
  },
  {
    name: 'map_businesses_to_collections_and_moods',
    run: async (pool) => {
      // Fetch collections and moods mapping ids
      const colRes = await pool.query('SELECT id, slug FROM collections');
      const colMap = {};
      colRes.rows.forEach(r => colMap[r.slug] = r.id);

      const moodRes = await pool.query('SELECT id, query_tag FROM moods');
      const moodMap = {};
      moodRes.rows.forEach(r => moodMap[r.query_tag] = r.id);

      // Fetch all businesses
      const bizRes = await pool.query('SELECT id, name FROM businesses');
      
      for (const biz of bizRes.rows) {
        const name = biz.name;
        let bizCols = [];
        let bizMoods = [];

        if (name.includes('Spice Garden')) {
          bizCols = ['quick-lunch'];
          bizMoods = ['Family', 'Veg'];
        } else if (name.includes('Rustic Barn')) {
          bizCols = ['outdoor-dining'];
          bizMoods = ['Premium', 'Outdoor'];
        } else if (name.includes('Umami House')) {
          bizCols = ['premium-dining', 'romantic-dining'];
          bizMoods = ['Premium', 'Asian', 'Romantic'];
        } else if (name.includes('Bella Napoli')) {
          bizCols = ['romantic-dining'];
          bizMoods = ['Romantic'];
        } else if (name.includes('Brew House')) {
          bizCols = ['outdoor-dining'];
          bizMoods = ['Outdoor'];
        } else if (name.includes('Dragon Palace')) {
          bizCols = ['quick-lunch'];
          bizMoods = ['Asian', 'Family'];
        } else if (name.includes('Smoke & Grill')) {
          bizCols = ['quick-lunch'];
          bizMoods = ['Family'];
        } else if (name.includes('Pasta Story')) {
          bizCols = ['quick-lunch'];
          bizMoods = ['Family'];
        } else if (name.includes('Cloud Nine')) {
          bizCols = ['premium-dining'];
          bizMoods = ['Premium'];
        } else if (name.includes('Royal Diner')) {
          bizCols = ['quick-lunch'];
          bizMoods = ['Family', 'Veg'];
        } else if (name.includes('Sushi 360')) {
          bizCols = ['premium-dining'];
          bizMoods = ['Premium', 'Asian'];
        } else if (name.includes('Sweet Spot')) {
          bizCols = ['hidden-gems'];
          bizMoods = ['Family'];
        }

        // Link to collections
        for (const colSlug of bizCols) {
          const colId = colMap[colSlug];
          if (colId) {
            await pool.query(`
              INSERT INTO business_collections (business_id, collection_id)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING;
            `, [biz.id, colId]);
          }
        }

        // Link to moods
        for (const moodTag of bizMoods) {
          const moodId = moodMap[moodTag];
          if (moodId) {
            await pool.query(`
              INSERT INTO business_moods (business_id, mood_id)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING;
            `, [biz.id, moodId]);
          }
        }
      }
      console.log('Data Seeding: Business mappings to collections/moods populated');
    }
  }
];

async function runAllMigrations(pool) {
  console.log('Running automatic database migrations (JS code style)...');

  try {
    // Ensure the migration history tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Fetch already executed migration list
    const { rows } = await pool.query('SELECT name FROM migration_history');
    const runMigrations = new Set(rows.map(r => r.name));

    for (const migration of migrationsList) {
      if (runMigrations.has(migration.name)) {
        console.log(`Migration already executed, skipping: ${migration.name}`);
        continue;
      }

      console.log(`Executing migration: ${migration.name}...`);
      await migration.run(pool);

      // Record migration execution in history
      await pool.query('INSERT INTO migration_history (name) VALUES ($1)', [migration.name]);
      console.log(`Migration completed successfully: ${migration.name}`);
    }

    console.log('All database migration checks/runs completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

module.exports = runAllMigrations;
