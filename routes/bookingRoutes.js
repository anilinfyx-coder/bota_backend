const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// ⚠️  ORDER MATTERS — more specific routes must come before wildcard param routes

// Check availability for a time slot
router.get('/availability', bookingController.checkAvailability);

// Get bookings for a specific customer (must be before /:business_id to avoid conflict)
router.get('/customer/:customer_id', bookingController.getCustomerBookings);

// Create a new reservation
router.post('/', bookingController.createBooking);

// Cancel / update booking status
router.put('/:id/cancel', bookingController.cancelBooking);

// Get all bookings for a business (wildcard — keep last)
router.get('/:business_id', bookingController.getBusinessBookings);

module.exports = router;
