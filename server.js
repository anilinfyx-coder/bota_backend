const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const businessRoutes = require('./routes/businessRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/businesses', businessRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
