const express = require('express');
const router = express.Router();
const Miner = require('../models/Miner');
const Task = require('../models/Task');
const Reward = require('../models/Reward');

router.get('/', async (req, res) => {
  try {
    // Get real counts from database
    const totalMiners = await Miner.countDocuments();
    
    // Online miners: prefer websocket count, fallback to DB status
    let onlineMiners = global.activeMiners ? global.activeMiners.size : 0;
    if (onlineMiners === 0) {
      // Check DB for recently active miners (last 5 minutes)
      const recentlyActive = await Miner.countDocuments({
        status: 'online',
        lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      });
      onlineMiners = recentlyActive;
    }
    
    // Task counts
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    
    // Calculate average response time
    const tasksWithResponse = await Task.find({ 
      status: 'completed',
      'responses.responseTime': { $exists: true }
    }).sort({ completedAt: -1 }).limit(100);
    
    let avgResponseTime = 0;
    let responseCount = 0;
    for (const task of tasksWithResponse) {
      for (const resp of task.responses || []) {
        if (resp.responseTime) {
          avgResponseTime += resp.responseTime;
          responseCount++;
        }
      }
    }
    avgResponseTime = responseCount > 0 ? avgResponseTime / responseCount : 0;
    
    // Sum all rewards distributed
    const rewardAgg = await Reward.aggregate([
      { $group: { _id: null, total: { $sum: { $toLong: '$amount' } } } }
    ]);
    const totalRewards = rewardAgg[0]?.total || 0;
    
    res.json({
      network: {
        totalMiners,
        activeMiners: totalMiners,
        onlineMiners
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: totalTasks - completedTasks,
        avgResponseTimeMs: Math.round(avgResponseTime)
      },
      rewards: {
        totalDistributed: totalRewards.toString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
