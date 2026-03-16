const express = require('express');
const router = express.Router();
const { MinerController } = require('../controllers/minerController');

// Register a new miner
router.post('/register', MinerController.register);

// Get miner info
router.get('/:address', MinerController.getInfo);

// Get miner dashboard (detailed stats)
router.get('/:address/dashboard', async (req, res) => {
  try {
    const { address } = req.params;
    const Miner = require('../models/Miner');
    const Task = require('../models/Task');
    const Reward = require('../models/Reward');
    
    const miner = await Miner.findOne({ address: address.toLowerCase() });
    if (!miner) {
      return res.status(404).json({ error: 'Miner not found' });
    }
    
    // Get recent tasks
    const recentTasks = await Task.find({ 
      'responses.miner': address.toLowerCase() 
    }).sort({ createdAt: -1 }).limit(10);
    
    // Get pending rewards
    const pendingRewards = await Reward.find({
      miner: address.toLowerCase(),
      status: 'pending'
    });
    
    const pendingTotal = pendingRewards.reduce((sum, r) => sum + BigInt(r.amount), 0n);
    
    // Get reward history
    const rewardHistory = await Reward.find({
      miner: address.toLowerCase()
    }).sort({ createdAt: -1 }).limit(20);
    
    // Calculate performance metrics
    const tasksWithMiner = await Task.find({
      'responses.miner': address.toLowerCase(),
      status: 'completed'
    });
    
    let totalScore = 0;
    let scoreCount = 0;
    
    for (const task of tasksWithMiner) {
      const response = task.responses.find(r => r.miner === address.toLowerCase());
      if (response && response.score) {
        totalScore += response.score;
        scoreCount++;
      }
    }
    
    const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
    
    res.json({
      miner: {
        address: miner.address,
        name: miner.name,
        status: miner.status,
        isEligible: miner.isEligible,
        reputation: miner.reputation,
        createdAt: miner.createdAt
      },
      stats: {
        ...miner.stats,
        averageScore: Math.round(avgScore)
      },
      rewards: {
        pending: pendingTotal.toString(),
        pendingCount: pendingRewards.length,
        history: rewardHistory.slice(0, 10)
      },
      recentTasks: recentTasks.map(t => ({
        id: t._id,
        type: t.type,
        status: t.status,
        score: t.responses.find(r => r.miner === address.toLowerCase())?.score,
        createdAt: t.createdAt
      })),
      isOnline: global.activeMiners.has(address.toLowerCase())
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// Get leaderboard
router.get('/leaderboard', MinerController.getLeaderboard);

// Get active miners
router.get('/active', MinerController.getActiveMiners);

module.exports = router;
