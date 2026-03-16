const express = require('express');
const router = express.Router();
const { RewardController } = require('../controllers/rewardController');

// Get pending rewards for a miner
router.get('/pending/:address', RewardController.getPending);

// Get reward history for a miner
router.get('/history/:address', RewardController.getHistory);

// Distribute pending rewards (admin)
router.post('/distribute', RewardController.distribute);

// Get global reward stats
router.get('/stats', RewardController.getStats);

module.exports = router;
