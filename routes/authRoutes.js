const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Standard login
router.post('/login', authController.login);

// Customer Registration
router.post('/register-customer', authController.registerCustomer);

// Super Admin creates a Business Admin
router.post('/register-business', authController.registerBusiness);

module.exports = router;
