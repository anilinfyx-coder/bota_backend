const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/stats', adminController.getGlobalStats);
router.put('/businesses/:id/subscription', adminController.updateSubscription);

// Marketing Plans
router.get('/marketing-plans', adminController.getMarketingPlans);
router.post('/marketing-plans', adminController.createMarketingPlan);
router.put('/marketing-plans/:id', adminController.updateMarketingPlan);
router.delete('/marketing-plans/:id', adminController.deleteMarketingPlan);

// Marketing Campaigns
router.get('/marketing-campaigns', adminController.getMarketingCampaigns);
router.post('/businesses/:id/marketing-campaigns', adminController.assignMarketingCampaign);

module.exports = router;
