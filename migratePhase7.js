const pool = require('./db');

const STATIC_RESTAURANTS = [
  {
    name: "Spice Garden",
    cuisine: "North Indian · Mughlai",
    address: "Bole, Addis Ababa, Ethiopia",
    rating: 4.5,
    reviews: 320,
    priceRange: "₹₹",
    isOpen: true,
    type_name: "Restaurant",
    image: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&q=80",
  },
  {
    name: "The Rustic Barn",
    cuisine: "Continental · Grills",
    address: "Piasa, Addis Ababa, Ethiopia",
    rating: 4.3,
    reviews: 210,
    priceRange: "₹₹₹",
    isOpen: true,
    type_name: "Bar",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80",
  },
  {
    name: "Umami House",
    cuisine: "Japanese · Sushi",
    address: "Kazanchis, Addis Ababa, Ethiopia",
    rating: 4.7,
    reviews: 180,
    priceRange: "₹₹₹₹",
    isOpen: true,
    type_name: "Restaurant",
    image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&q=80",
  },
  {
    name: "Bella Napoli",
    cuisine: "Italian · Pizza",
    address: "Sarbet, Addis Ababa, Ethiopia",
    rating: 4.4,
    reviews: 156,
    priceRange: "₹₹",
    isOpen: false,
    type_name: "Restaurant",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80",
  },
  {
    name: "The Brew House",
    cuisine: "Cafe · Desserts",
    address: "Bole Atlas, Addis Ababa, Ethiopia",
    rating: 4.6,
    reviews: 430,
    priceRange: "₹₹",
    isOpen: true,
    type_name: "Cafe",
    image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&q=80",
  },
  {
    name: "Dragon Palace",
    cuisine: "Chinese · Dim Sum",
    address: "Haya Hulet, Addis Ababa, Ethiopia",
    rating: 4.1,
    reviews: 290,
    priceRange: "₹₹",
    isOpen: true,
    type_name: "Restaurant",
    image: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80",
  },
  {
    name: "Smoke & Grill",
    cuisine: "American · Burgers",
    address: "Megenagna, Addis Ababa, Ethiopia",
    rating: 4.3,
    reviews: 190,
    priceRange: "₹₹₹",
    isOpen: true,
    type_name: "Restaurant",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80",
  },
  {
    name: "The Pasta Story",
    cuisine: "Italian · Pasta",
    address: "Kirkos, Addis Ababa, Ethiopia",
    rating: 4.2,
    reviews: 140,
    priceRange: "₹₹",
    isOpen: true,
    type_name: "Restaurant",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80",
  },
  {
    name: "Cloud Nine Cafe",
    cuisine: "Cafe · Bakery",
    address: "Old Airport, Addis Ababa, Ethiopia",
    rating: 4.8,
    reviews: 520,
    priceRange: "₹₹",
    isOpen: true,
    type_name: "Cafe",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&q=80",
  },
  {
    name: "Royal Diner",
    cuisine: "Indian · Biryani",
    address: "Lebu, Addis Ababa, Ethiopia",
    rating: 4.0,
    reviews: 380,
    priceRange: "₹",
    isOpen: false,
    type_name: "Restaurant",
    image: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=500&q=80",
  },
  {
    name: "Sushi 360",
    cuisine: "Japanese · Asian",
    address: "Bole Road, Addis Ababa, Ethiopia",
    rating: 4.6,
    reviews: 240,
    priceRange: "₹₹₹₹",
    isOpen: true,
    type_name: "Restaurant",
    image: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80",
  },
  {
    name: "The Sweet Spot",
    cuisine: "Desserts · Ice Cream",
    address: "CMC, Addis Ababa, Ethiopia",
    rating: 4.9,
    reviews: 610,
    priceRange: "₹",
    isOpen: true,
    type_name: "Cafe",
    image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=500&q=80",
  }
];

async function migrate() {
    try {
        await pool.query('BEGIN');

        console.log("1. Creating missing columns in 'businesses' table...");
        const alterQueries = [
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cuisine VARCHAR(255)",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2)",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS reviews_count INTEGER",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS price_range VARCHAR(50)",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT TRUE",
            "ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL"
        ];

        for (const query of alterQueries) {
            await pool.query(query);
        }

        console.log("2. Adding index on owner_id...");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id)");

        console.log("3. Fetching user ID of anil@mailinator.com...");
        const userRes = await pool.query("SELECT id FROM users WHERE email = 'anil@mailinator.com'");
        if (userRes.rows.length === 0) {
            throw new Error("User anil@mailinator.com not found!");
        }
        const ownerId = userRes.rows[0].id;
        console.log(`User ID is: ${ownerId}`);

        console.log("4. Updating the owner and address of the main 'anil' business...");
        await pool.query(
            "UPDATE businesses SET owner_id = $1, address = 'Bole, Addis Ababa, Ethiopia' WHERE id = 'c8f842ff-c79a-4b27-8e69-4dbdecd30bac'",
            [ownerId]
        );

        console.log("5. Cleaning up old seeded static restaurants for this owner...");
        await pool.query(
            "DELETE FROM businesses WHERE owner_id = $1 AND id != 'c8f842ff-c79a-4b27-8e69-4dbdecd30bac'",
            [ownerId]
        );

        console.log("6. Inserting static restaurants...");
        const typeMap = {
            'Restaurant': 1,
            'Cafe': 2,
            'Bar': 3
        };

        for (const rest of STATIC_RESTAURANTS) {
            const typeId = typeMap[rest.type_name] || 1;
            await pool.query(`
                INSERT INTO businesses (
                    name, address, type_id, subscription_plan, subscription_status, 
                    description, cover_image_url, grace_time_minutes, online_allocation_percentage,
                    cuisine, rating, reviews_count, price_range, is_open, owner_id
                ) VALUES (
                    $1, $2, $3, 'PRO', 'ACTIVE', 
                    $4, $5, 120, 50,
                    $6, $7, $8, $9, $10, $11
                )
            `, [
                rest.name, rest.address, typeId, 
                `${rest.name} is a fine establishment.`, rest.image,
                rest.cuisine, rest.rating, rest.reviews, rest.priceRange, rest.isOpen, ownerId
            ]);
            console.log(`Inserted ${rest.name}`);
        }

        await pool.query('COMMIT');
        console.log("Phase 7 Migration & Seeding completed successfully!");
        process.exit(0);

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
