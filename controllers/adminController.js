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
