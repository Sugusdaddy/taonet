const express = require('express');
const router = express.Router();
const Airdrop = require('../models/Airdrop');
const airdropService = require('../services/airdropService');

// Get airdrop stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await airdropService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent airdrops
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const airdrops = await airdropService.getRecent(limit);
    res.json({ airdrops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get airdrops for a specific miner
router.get('/miner/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    
    const airdrops = await Airdrop.find({ recipient: address.toLowerCase() })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    const totals = await Airdrop.aggregate([
      { $match: { recipient: address.toLowerCase() } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: { $toLong: '$amount' } }
        }
      }
    ]);
    
    res.json({
      airdrops,
      summary: totals
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Force process pending (admin only - add auth in production)
router.post('/process', async (req, res) => {
  try {
    const result = await airdropService.processPending();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
