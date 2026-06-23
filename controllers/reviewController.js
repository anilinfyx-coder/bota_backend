const pool = require('../db');

exports.createReview = async (req, res) => {
    const { businessId } = req.params;
    const { user_name, rating, text } = req.body;

    try {
        // Insert the new review
        const newReview = await pool.query(
            'INSERT INTO reviews (business_id, user_name, rating, text) VALUES ($1, $2, $3, $4) RETURNING *',
            [businessId, user_name, rating, text]
        );

        // Calculate the new average rating and total review count
        const stats = await pool.query(
            'SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM reviews WHERE business_id = $1',
            [businessId]
        );

        const count = parseInt(stats.rows[0].count);
        const avg_rating = parseFloat(stats.rows[0].avg_rating).toFixed(1);

        // Update the business table
        await pool.query(
            'UPDATE businesses SET rating = $1, reviews_count = $2 WHERE id = $3',
            [avg_rating, count, businessId]
        );

        res.status(201).json({ 
            message: 'Review added successfully', 
            data: newReview.rows[0],
            newStats: { rating: avg_rating, reviews_count: count }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getReviews = async (req, res) => {
    const { businessId } = req.params;
    try {
        // Fetch reviews
        const reviewResult = await pool.query(
            'SELECT * FROM reviews WHERE business_id = $1 ORDER BY created_at DESC',
            [businessId]
        );
        const reviews = reviewResult.rows;

        if (reviews.length > 0) {
            // Fetch replies for these reviews
            const reviewIds = reviews.map(r => r.id);
            const repliesResult = await pool.query(
                'SELECT * FROM review_replies WHERE review_id = ANY($1) ORDER BY created_at ASC',
                [reviewIds]
            );
            const replies = repliesResult.rows;

            // Group replies by review_id
            const repliesByReviewId = {};
            replies.forEach(reply => {
                if (!repliesByReviewId[reply.review_id]) {
                    repliesByReviewId[reply.review_id] = [];
                }
                repliesByReviewId[reply.review_id].push(reply);
            });

            // Attach replies to reviews
            reviews.forEach(review => {
                review.replies = repliesByReviewId[review.id] || [];
            });
        }

        res.json({ data: reviews });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createReply = async (req, res) => {
    const { reviewId } = req.params;
    const { user_name, user_type, text } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO review_replies (review_id, user_name, user_type, text) VALUES ($1, $2, $3, $4) RETURNING *',
            [reviewId, user_name, user_type || 'customer', text]
        );
        res.status(201).json({ 
            message: 'Reply added successfully', 
            data: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
