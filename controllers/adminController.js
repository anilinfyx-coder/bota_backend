const pool = require('../db');

exports.getGlobalStats = async (req, res) => {
    try {
        const bookingsCount = await pool.query('SELECT COUNT(*) FROM bookings');
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const businessesCount = await pool.query('SELECT COUNT(*) FROM businesses');
        
        // Mock revenue logic (e.g. 50 cents per booking fee)
        const revenue = parseInt(bookingsCount.rows[0].count) * 0.50;

        res.json({
            data: {
                total_bookings: parseInt(bookingsCount.rows[0].count),
                active_users: parseInt(usersCount.rows[0].count),
                active_businesses: parseInt(businessesCount.rows[0].count),
                platform_revenue: revenue
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSubscription = async (req, res) => {
    const { id } = req.params;
    const { subscription_plan } = req.body;
    try {
        const result = await pool.query(
            'UPDATE businesses SET subscription_plan = $1 WHERE id = $2 RETURNING *',
            [subscription_plan, id]
        );
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMarketingPlans = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM marketing_plans ORDER BY id ASC');
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createMarketingPlan = async (req, res) => {
    const { name, duration_days, price, is_active } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO marketing_plans (name, duration_days, price, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, duration_days, price, is_active]
        );
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateMarketingPlan = async (req, res) => {
    const { id } = req.params;
    const { name, duration_days, price, is_active } = req.body;
    try {
        const result = await pool.query(
            'UPDATE marketing_plans SET name = $1, duration_days = $2, price = $3, is_active = $4 WHERE id = $5 RETURNING *',
            [name, duration_days, price, is_active, id]
        );
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteMarketingPlan = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM marketing_plans WHERE id = $1', [id]);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.assignMarketingCampaign = async (req, res) => {
    const { id: business_id } = req.params;
    const { plan_id, end_date } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO business_marketing_campaigns (business_id, plan_id, end_date) VALUES ($1, $2, $3) RETURNING *',
            [business_id, plan_id, end_date]
        );
        res.json({ data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMarketingCampaigns = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT bmc.*, b.name as business_name, mp.name as plan_name 
            FROM business_marketing_campaigns bmc
            JOIN businesses b ON bmc.business_id = b.id
            JOIN marketing_plans mp ON bmc.plan_id = mp.id
            ORDER BY bmc.created_at DESC
        `);
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
