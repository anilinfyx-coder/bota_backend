const pool = require('../db');

exports.updateSettings = async (req, res) => {
    const { id } = req.params;
    const { name, address, cuisine, grace_time_minutes, online_allocation_percentage, operating_hours, gallery_images, menu_images, phone, description, cover_image_url, dining_offers, amenities, average_cost } = req.body;

    try {
        const result = await pool.query(
            `UPDATE businesses 
             SET grace_time_minutes = COALESCE($1, grace_time_minutes), 
                 online_allocation_percentage = COALESCE($2, online_allocation_percentage), 
                 operating_hours = COALESCE($3, operating_hours), 
                 gallery_images = COALESCE($4, gallery_images), 
                 menu_images = COALESCE($5, menu_images),
                 phone = COALESCE($6, phone),
                 description = COALESCE($7, description),
                 cover_image_url = COALESCE($8, cover_image_url),
                 dining_offers = COALESCE($9::jsonb, dining_offers),
                 amenities = COALESCE($10::jsonb, amenities),
                 average_cost = COALESCE($11, average_cost),
                 name = COALESCE($13, name),
                 address = COALESCE($14, address),
                 cuisine = COALESCE($15, cuisine)
             WHERE id = $12 RETURNING *`,
            [
                grace_time_minutes, 
                online_allocation_percentage, 
                operating_hours ? JSON.stringify(operating_hours) : null, 
                gallery_images, 
                menu_images, 
                phone, 
                description, 
                cover_image_url, 
                dining_offers ? JSON.stringify(dining_offers) : null, 
                amenities ? JSON.stringify(amenities) : null,
                average_cost,
                id,
                name,
                address,
                cuisine
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Business not found' });
        }

        res.json({ message: 'Settings updated successfully', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSettings = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT name, address, cuisine, grace_time_minutes, online_allocation_percentage, phone, description, cover_image_url, operating_hours, gallery_images, menu_images, dining_offers, amenities, average_cost FROM businesses WHERE id = $1', [id]);
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getPublicProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT b.id, b.name, b.address, b.phone, b.description, b.cover_image_url, 
                   b.cuisine, b.rating, b.reviews_count, b.price_range, b.is_open, 
                   b.owner_id, bt.name as type_name, b.operating_hours,
                   b.gallery_images, b.menu_images, b.dining_offers, b.amenities, b.average_cost,
                   COALESCE(
                     (SELECT json_agg(c.slug) 
                      FROM business_collections bc 
                      JOIN collections c ON bc.collection_id = c.id 
                      WHERE bc.business_id = b.id), 
                     '[]'::json
                   ) as collection_slugs
            FROM businesses b 
            LEFT JOIN business_types bt ON b.type_id = bt.id 
            WHERE b.id = $1
        `, [id]);
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getAllBusinesses = async (req, res) => {
    const { collection, mood } = req.query;
    try {
        let queryStr = `
            SELECT b.id, b.name, b.address, b.phone, b.subscription_plan, 
                   b.cover_image_url, b.cuisine, b.rating, b.reviews_count, 
                   b.price_range, b.is_open, b.owner_id, bt.name as type_name, b.dining_offers, b.amenities, b.average_cost
            FROM businesses b 
            LEFT JOIN business_types bt ON b.type_id = bt.id
        `;
        const conditions = [];
        const params = [];

        if (collection) {
            conditions.push(`b.id IN (
                SELECT bc.business_id 
                FROM business_collections bc
                JOIN collections c ON bc.collection_id = c.id
                WHERE c.slug = $${params.length + 1}
            )`);
            params.push(collection);
        }

        if (mood) {
            conditions.push(`b.id IN (
                SELECT bm.business_id 
                FROM business_moods bm
                JOIN moods m ON bm.mood_id = m.id
                WHERE m.query_tag = $${params.length + 1}
            )`);
            params.push(mood);
        }

        if (conditions.length > 0) {
            queryStr += ' WHERE ' + conditions.join(' AND ');
        }

        const result = await pool.query(queryStr, params);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getCollections = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.id, c.title, c.subtitle, c.image_url, c.color_gradient, c.slug,
                   COALESCE(COUNT(bc.business_id), 0)::integer as places_count
            FROM collections c
            LEFT JOIN business_collections bc ON c.id = bc.collection_id
            GROUP BY c.id, c.title, c.subtitle, c.image_url, c.color_gradient, c.slug
            ORDER BY c.id ASC
        `);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getMoods = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, title, image_url, query_tag
            FROM moods
            ORDER BY id ASC
        `);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getBusinessTypes = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM business_types ORDER BY name ASC');
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getTables = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM tables WHERE business_id = $1 ORDER BY table_number ASC', [id]);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.createTable = async (req, res) => {
    const { id } = req.params;
    const { table_number, capacity } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO tables (business_id, table_number, capacity) VALUES ($1, $2, $3) RETURNING *',
            [id, table_number, capacity]
        );
        res.status(201).json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.updateTableStatus = async (req, res) => {
    const { id, tableId } = req.params;
    const { is_active } = req.body;
    try {
        const result = await pool.query(
            'UPDATE tables SET is_active = $1 WHERE id = $2 AND business_id = $3 RETURNING *',
            [is_active, tableId, id]
        );
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.deleteTable = async (req, res) => {
    const { id, tableId } = req.params;
    try {
        await pool.query('DELETE FROM tables WHERE id = $1 AND business_id = $2', [tableId, id]);
        res.json({ message: 'Table deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getAnalytics = async (req, res) => {
    const { id } = req.params;
    try {
        // Total bookings
        const totalBookings = await pool.query('SELECT COUNT(*) FROM bookings WHERE business_id = $1', [id]);
        
        // Walk-in vs Online
        const sourceStats = await pool.query(`
            SELECT booking_source, COUNT(*) as count 
            FROM bookings 
            WHERE business_id = $1 
            GROUP BY booking_source
        `, [id]);

        // Status (Confirmed vs Cancelled)
        const statusStats = await pool.query(`
            SELECT status, COUNT(*) as count 
            FROM bookings 
            WHERE business_id = $1 
            GROUP BY status
        `, [id]);

        res.json({ 
            data: {
                total_bookings: parseInt(totalBookings.rows[0].count),
                sources: sourceStats.rows,
                statuses: statusStats.rows
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
