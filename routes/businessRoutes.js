const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');

// Route to get all business types (master table)
router.get('/types', businessController.getBusinessTypes);

// Route to get collections and moods
router.get('/collections', businessController.getCollections);
router.get('/moods', businessController.getMoods);

// Route to get all businesses for the public portal
router.get('/', businessController.getAllBusinesses);

// Route to get business settings
router.get('/:id/settings', businessController.getSettings);

// Route to get public profile details
router.get('/:id/public', businessController.getPublicProfile);

// Route to update grace time and allocation percentage
router.put('/:id/settings', businessController.updateSettings);

// Route to get tables for a business
router.get('/:id/tables', businessController.getTables);

// Route to add a table to a business
router.post('/:id/tables', businessController.createTable);

// Route to update a table's status
router.put('/:id/tables/:tableId', businessController.updateTableStatus);

// Route to delete a table
router.delete('/:id/tables/:tableId', businessController.deleteTable);

// Route to get business analytics
router.get('/:id/analytics', businessController.getAnalytics);

// Route to get active campaigns for a business
router.get('/:id/campaigns', businessController.getCampaigns);

module.exports = router;
