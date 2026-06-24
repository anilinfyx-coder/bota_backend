const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const businessRoutes = require('./routes/businessRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const path = require('path');
const runAllMigrations = require('./migrations');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/businesses', businessRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);

// Serve static files from the public directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Restaurant Booking API is running' });
});

// Test DB Connection Route
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'OK', timestamp: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});

// Run migrations before starting the server
runAllMigrations(pool).then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
