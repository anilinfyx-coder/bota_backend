/**
 * Common Migrations File
 * Developers can add their future database migration scripts here.
 * This file is automatically executed when the backend server starts.
 */

const bcrypt = require('bcrypt');

const DEFAULT_SEED_PASSWORD = 'Admin@123';

const STATIC_RESTAURANTS = [
  { name: 'Spice Garden', cuisine: 'North Indian · Mughlai', address: 'Bole, Addis Ababa, Ethiopia', rating: 4.5, reviews: 320, priceRange: '₹₹', isOpen: true, type_name: 'Restaurant', image: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&q=80' },
  { name: 'The Rustic Barn', cuisine: 'Continental · Grills', address: 'Piasa, Addis Ababa, Ethiopia', rating: 4.3, reviews: 210, priceRange: '₹₹₹', isOpen: true, type_name: 'Bar', image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80' },
  { name: 'Umami House', cuisine: 'Japanese · Sushi', address: 'Kazanchis, Addis Ababa, Ethiopia', rating: 4.7, reviews: 180, priceRange: '₹₹₹₹', isOpen: true, type_name: 'Restaurant', image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&q=80' },
  { name: 'Bella Napoli', cuisine: 'Italian · Pizza', address: 'Sarbet, Addis Ababa, Ethiopia', rating: 4.4, reviews: 156, priceRange: '₹₹', isOpen: false, type_name: 'Restaurant', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80' },
  { name: 'The Brew House', cuisine: 'Cafe · Desserts', address: 'Bole Atlas, Addis Ababa, Ethiopia', rating: 4.6, reviews: 430, priceRange: '₹₹', isOpen: true, type_name: 'Cafe', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&q=80' },
  { name: 'Dragon Palace', cuisine: 'Chinese · Dim Sum', address: 'Haya Hulet, Addis Ababa, Ethiopia', rating: 4.1, reviews: 290, priceRange: '₹₹', isOpen: true, type_name: 'Restaurant', image: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80' },
  { name: 'Smoke & Grill', cuisine: 'American · Burgers', address: 'Megenagna, Addis Ababa, Ethiopia', rating: 4.3, reviews: 190, priceRange: '₹₹₹', isOpen: true, type_name: 'Restaurant', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80' },
  { name: 'The Pasta Story', cuisine: 'Italian · Pasta', address: 'Kirkos, Addis Ababa, Ethiopia', rating: 4.2, reviews: 140, priceRange: '₹₹', isOpen: true, type_name: 'Restaurant', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80' },
  { name: 'Cloud Nine Cafe', cuisine: 'Cafe · Bakery', address: 'Old Airport, Addis Ababa, Ethiopia', rating: 4.8, reviews: 520, priceRange: '₹₹', isOpen: true, type_name: 'Cafe', image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&q=80' },
  { name: 'Royal Diner', cuisine: 'Indian · Biryani', address: 'Lebu, Addis Ababa, Ethiopia', rating: 4.0, reviews: 380, priceRange: '₹', isOpen: false, type_name: 'Restaurant', image: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=500&q=80' }
];

function businessAdminEmailFromName(name) {
  const slug = name
    .toLowerCase()
    .replace(/^the /, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}@bookmybota.com`;
}

async function seedSuperAdmin(pool) {
  const adminCheck = await pool.query("SELECT id FROM users WHERE email = 'admin@reserve.com'");
  if (adminCheck.rows.length > 0) return false;

  const hash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 10);
  await pool.query(
    "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'super_admin')",
    ['admin@reserve.com', hash]
  );
  return true;
}

async function seedBusinessWithAdmin(pool, rest, passwordHash) {
  const typeMap = { Restaurant: 1, Cafe: 2, Bar: 3 };
  const adminEmail = businessAdminEmailFromName(rest.name);
  let businessAdded = false;
  let userAdded = false;

  let businessId;
  const existingBiz = await pool.query('SELECT id FROM businesses WHERE name = $1', [rest.name]);
  if (existingBiz.rows.length > 0) {
    businessId = existingBiz.rows[0].id;
  } else {
    const typeId = typeMap[rest.type_name] || 1;
    const bizRes = await pool.query(`
      INSERT INTO businesses (
        name, address, type_id, subscription_plan, subscription_status,
        description, cover_image_url, grace_time_minutes, online_allocation_percentage,
        cuisine, rating, reviews_count, price_range, is_open
      ) VALUES (
        $1, $2, $3, 'PRO', 'ACTIVE',
        $4, $5, 120, 50,
        $6, $7, $8, $9, $10
      )
      RETURNING id
    `, [
      rest.name, rest.address, typeId,
      `${rest.name} is a fine establishment.`, rest.image,
      rest.cuisine, rest.rating, rest.reviews, rest.priceRange, rest.isOpen
    ]);
    businessId = bizRes.rows[0].id;
    businessAdded = true;
  }

  const existingUser = await pool.query('SELECT id, business_id FROM users WHERE email = $1', [adminEmail]);
  if (existingUser.rows.length === 0) {
    const userRes = await pool.query(
      "INSERT INTO users (email, password_hash, role, business_id) VALUES ($1, $2, 'business_admin', $3) RETURNING id",
      [adminEmail, passwordHash, businessId]
    );
    await pool.query('UPDATE businesses SET owner_id = $1 WHERE id = $2', [userRes.rows[0].id, businessId]);
    userAdded = true;
  } else {
    const userId = existingUser.rows[0].id;
    if (!existingUser.rows[0].business_id) {
      await pool.query('UPDATE users SET business_id = $1 WHERE id = $2', [businessId, userId]);
    }
    await pool.query('UPDATE businesses SET owner_id = $1 WHERE id = $2 AND owner_id IS NULL', [userId, businessId]);
  }

  return { businessAdded, userAdded, adminEmail };
}

const OPERATING_HOUR_PROFILES = [
  {
    daily: { open: '08:00', close: '23:30', closed: false },
    sunday: { open: '09:00', close: '23:00', closed: false },
    meals: {
      breakfast: { open: '08:00', close: '11:00', active: true },
      lunch: { open: '11:30', close: '15:30', active: true },
      dinner: { open: '18:00', close: '23:00', active: true }
    }
  },
  {
    daily: { open: '11:00', close: '23:00', closed: false },
    sunday: { open: '11:00', close: '22:00', closed: false },
    meals: {
      breakfast: { open: '07:00', close: '10:30', active: false },
      lunch: { open: '11:00', close: '15:00', active: true },
      dinner: { open: '17:30', close: '23:00', active: true }
    }
  },
  {
    daily: { open: '10:00', close: '01:00', closed: false },
    sunday: { open: '11:00', close: '23:30', closed: false },
    meals: {
      breakfast: { open: '10:00', close: '12:00', active: true },
      lunch: { open: '12:30', close: '16:00', active: true },
      dinner: { open: '19:00', close: '01:00', active: true }
    }
  },
  {
    daily: { open: '07:30', close: '21:00', closed: false },
    sunday: { open: '08:00', close: '20:00', closed: false },
    meals: {
      breakfast: { open: '07:30', close: '11:30', active: true },
      lunch: { open: '12:00', close: '16:30', active: true },
      dinner: { open: '17:00', close: '21:00', active: true }
    }
  }
];

const TABLE_CONFIGS = [
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

async function mapBusinessesToCollectionsAndMoods(pool) {
  const colRes = await pool.query('SELECT id, slug FROM collections');
  const colMap = {};
  colRes.rows.forEach((r) => { colMap[r.slug] = r.id; });

  const moodRes = await pool.query('SELECT id, query_tag FROM moods');
  const moodMap = {};
  moodRes.rows.forEach((r) => { moodMap[r.query_tag] = r.id; });

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
}

const migrationsList = [
  {
    name: 'create_base_schema',
    run: async (pool) => {
      await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS business_types (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL
        );
      `);

      await pool.query(`
        INSERT INTO business_types (name) VALUES
          ('Restaurant'), ('Cafe'), ('Bar'), ('Fine Dining'), ('Pub')
        ON CONFLICT DO NOTHING;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS businesses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          address TEXT,
          grace_time_minutes INTEGER DEFAULT 120,
          online_allocation_percentage INTEGER DEFAULT 50,
          type_id INT REFERENCES business_types(id),
          subscription_plan VARCHAR(50) DEFAULT 'FREE' CHECK (subscription_plan IN ('FREE', 'PRO')),
          subscription_status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (subscription_status IN ('ACTIVE', 'SUSPENDED')),
          phone VARCHAR(50),
          description TEXT,
          cover_image_url TEXT,
          operating_hours JSONB,
          cuisine VARCHAR(255),
          rating NUMERIC(3, 2),
          reviews_count INTEGER DEFAULT 0,
          price_range VARCHAR(50),
          is_open BOOLEAN DEFAULT TRUE,
          average_cost NUMERIC,
          amenities JSONB DEFAULT '[]',
          dining_offers JSONB DEFAULT '[]',
          gallery_images JSONB DEFAULT '[]',
          menu_images JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'business_admin', 'customer')),
          business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        ALTER TABLE businesses
          ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          email VARCHAR(255),
          is_registered_user BOOLEAN DEFAULT false,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS tables (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          table_number VARCHAR(50) NOT NULL,
          capacity INTEGER NOT NULL DEFAULT 4,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS bookings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
          guest_name VARCHAR(255),
          guest_phone VARCHAR(50),
          guests INTEGER NOT NULL DEFAULT 2,
          booking_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP NOT NULL,
          status VARCHAR(50) DEFAULT 'CONFIRMED',
          booking_source VARCHAR(50) DEFAULT 'ONLINE',
          table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
          user_name VARCHAR(100) NOT NULL,
          rating NUMERIC(2, 1) NOT NULL,
          text TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('Schema update: Created base tables (businesses, users, customers, tables, bookings, reviews)');
    }
  },
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
      await mapBusinessesToCollectionsAndMoods(pool);
      console.log('Data Seeding: Business mappings to collections/moods populated');
    }
  },
  {
    name: 'seed_default_users',
    run: async (pool) => {
      const created = await seedSuperAdmin(pool);
      if (created) {
        console.log(`Seeded super admin: admin@reserve.com / ${DEFAULT_SEED_PASSWORD}`);
      }
    }
  },
  {
    name: 'seed_static_restaurants',
    run: async (pool) => {
      const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 10);
      let businessesAdded = 0;
      let usersAdded = 0;

      for (const rest of STATIC_RESTAURANTS) {
        const result = await seedBusinessWithAdmin(pool, rest, passwordHash);
        if (result.businessAdded) businessesAdded++;
        if (result.userAdded) usersAdded++;
      }

      console.log(`Data seeding: ${businessesAdded} businesses and ${usersAdded} business admins added (password: ${DEFAULT_SEED_PASSWORD})`);
    }
  },
  {
    name: 'seed_business_tables',
    run: async (pool) => {
      const bizRes = await pool.query('SELECT id, name FROM businesses');
      let seeded = 0;

      for (const biz of bizRes.rows) {
        const tablesRes = await pool.query(
          'SELECT count(*)::int AS count FROM tables WHERE business_id = $1',
          [biz.id]
        );
        if (tablesRes.rows[0].count > 0) continue;

        for (const cfg of TABLE_CONFIGS) {
          await pool.query(
            'INSERT INTO tables (business_id, table_number, capacity, is_active) VALUES ($1, $2, $3, true)',
            [biz.id, cfg.number, cfg.capacity]
          );
        }
        seeded++;
      }

      console.log(`Data seeding: tables added for ${seeded} businesses (skipped businesses that already had tables)`);
    }
  },
  {
    name: 'seed_operating_hours',
    run: async (pool) => {
      const bizRes = await pool.query(
        'SELECT id, name FROM businesses WHERE operating_hours IS NULL ORDER BY name'
      );
      let updated = 0;

      for (let i = 0; i < bizRes.rows.length; i++) {
        const biz = bizRes.rows[i];
        const profile = OPERATING_HOUR_PROFILES[i % OPERATING_HOUR_PROFILES.length];
        const operatingHours = {
          monday: { ...profile.daily },
          tuesday: { ...profile.daily },
          wednesday: { ...profile.daily },
          thursday: { ...profile.daily },
          friday: { ...profile.daily },
          saturday: { ...profile.daily },
          sunday: { ...profile.sunday },
          meals: { ...profile.meals }
        };

        await pool.query(
          'UPDATE businesses SET operating_hours = $1 WHERE id = $2 AND operating_hours IS NULL',
          [JSON.stringify(operatingHours), biz.id]
        );
        updated++;
      }

      console.log(`Data seeding: operating hours set for ${updated} businesses (skipped businesses that already had hours)`);
    }
  },
  {
    name: 'refresh_business_collection_mood_mappings',
    run: async (pool) => {
      await mapBusinessesToCollectionsAndMoods(pool);
      console.log('Data seeding: refreshed business collection/mood mappings for any new restaurants');
    }
  },
  {
    name: 'ensure_bookings_schema_updates',
    run: async (pool) => {
      await pool.query('ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL');
      await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guests INTEGER NOT NULL DEFAULT 2');
      await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255)');
      await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50)');
      await pool.query('ALTER TABLE bookings ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES tables(id) ON DELETE SET NULL');
      await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL');
      console.log('Schema update: ensured bookings/customers columns from phase migrations');
    }
  },
  {
    name: 'seed_demo_test_data',
    run: async (pool) => {
      let bizInserted = false;
      const existingBiz = await pool.query(
        "SELECT id FROM businesses WHERE name = 'The Sapphire Room'"
      );

      if (existingBiz.rows.length === 0) {
        const bizRes = await pool.query(`
          INSERT INTO businesses (name, address, grace_time_minutes, online_allocation_percentage)
          VALUES ('The Sapphire Room', 'Downtown Italian', 120, 50)
          RETURNING id
        `);
        const bizId = bizRes.rows[0].id;

        for (let i = 1; i <= 10; i++) {
          await pool.query(
            'INSERT INTO tables (business_id, table_number, capacity) VALUES ($1, $2, 4)',
            [bizId, `T-${i}`]
          );
        }
        bizInserted = true;
      }

      const existingCustomer = await pool.query(
        "SELECT id FROM customers WHERE phone = '555-0123'"
      );
      let customerInserted = false;
      if (existingCustomer.rows.length === 0) {
        await pool.query(
          "INSERT INTO customers (name, phone, is_registered_user) VALUES ('John Doe', '555-0123', false)"
        );
        customerInserted = true;
      }

      console.log(`Data seeding: demo test data — business ${bizInserted ? 'added' : 'exists'}, customer ${customerInserted ? 'added' : 'exists'}`);
    }
  },
  {
    name: 'create_marketing_tables',
    run: async (pool) => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS marketing_plans (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) UNIQUE NOT NULL,
          duration_days INT NOT NULL,
          price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        INSERT INTO marketing_plans (name, duration_days, price, is_active) VALUES
          ('Top Search Priority - 1 Month', 30, 49.99, true),
          ('Top Search Priority - 3 Months', 90, 129.99, true)
        ON CONFLICT (name) DO NOTHING;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS business_marketing_campaigns (
          id SERIAL PRIMARY KEY,
          business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
          plan_id INT REFERENCES marketing_plans(id) ON DELETE RESTRICT,
          start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          end_date TIMESTAMP NOT NULL,
          status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      console.log('Schema update: marketing_plans and business_marketing_campaigns ready');
    }
  },
  {
    name: 'seed_businesses_with_admin_users',
    run: async (pool) => {
      const adminCreated = await seedSuperAdmin(pool);
      if (adminCreated) {
        console.log(`Seeded super admin: admin@reserve.com / ${DEFAULT_SEED_PASSWORD}`);
      }

      const passwordHash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 10);
      let businessesAdded = 0;
      let usersAdded = 0;
      const seededAccounts = [];

      for (const rest of STATIC_RESTAURANTS) {
        const result = await seedBusinessWithAdmin(pool, rest, passwordHash);
        if (result.businessAdded) businessesAdded++;
        if (result.userAdded) {
          usersAdded++;
          seededAccounts.push(`${result.adminEmail}`);
        }
      }

      console.log(`Data seeding: ${businessesAdded} businesses and ${usersAdded} business admins (password: ${DEFAULT_SEED_PASSWORD})`);
      if (seededAccounts.length > 0) {
        console.log(`Business admin emails: ${seededAccounts.join(', ')}`);
      }
    }
  },
  {
    name: 'sync_seed_account_passwords',
    run: async (pool) => {
      const hash = await bcrypt.hash(DEFAULT_SEED_PASSWORD, 10);
      const result = await pool.query(`
        UPDATE users
        SET password_hash = $1
        WHERE email = 'admin@reserve.com'
           OR email LIKE '%@bookmybota.com'
           OR email = 'anil@mailinator.com'
      `, [hash]);

      console.log(`Updated ${result.rowCount} seeded account passwords to ${DEFAULT_SEED_PASSWORD}`);
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
