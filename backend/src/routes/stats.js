const express = require('express');
const router = express.Router();
const Miner = require('../models/Miner');
const Task = require('../models/Task');
const Reward = require('../models/Reward');

// Get network statistics
router.get('/', async (req, res) => {
  try {
    const [
      totalMiners,
      activeMiners,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalRewardsDistributed
    ] = await Promise.all([
      Miner.countDocuments(),
      Miner.countDocuments({ status: { $in: ['online', 'busy'] } }),
      Task.countDocuments(),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'pending' }),
      Reward.aggregate([
        { $match: { status: 'distributed' } },
        { $group: { _id: null, total: { $sum: { $toLong: '$amount' } } } }
      ])
    ]);
    
    const avgResponseTime = await Task.aggregate([
      { $match: { status: 'completed', completedAt: { $exists: true } } },
      {
        $project: {
          responseTime: { $subtract: ['$completedAt', '$createdAt'] }
        }
      },
      { $group: { _id: null, avg: { $avg: '$responseTime' } } }
    ]);
    
    res.json({
      network: {
        totalMiners,
        activeMiners,
        onlineMiners: global.activeMiners.size
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        avgResponseTimeMs: avgResponseTime[0]?.avg || 0
      },
      rewards: {
        totalDistributed: totalRewardsDistributed[0]?.total?.toString() || '0'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { sortBy = 'rewards', limit = 50 } = req.query;
    
    let sortField;
    switch (sortBy) {
      case 'rewards':
        sortField = { 'stats.totalRewards': -1 };
        break;
      case 'score':
        sortField = { 'stats.averageScore': -1 };
        break;
      case 'reputation':
        sortField = { reputation: -1 };
        break;
      case 'tasks':
        sortField = { 'stats.completedTasks': -1 };
        break;
      default:
        sortField = { 'stats.totalRewards': -1 };
    }
    
    const miners = await Miner.find({ 'stats.completedTasks': { $gt: 0 } })
      .sort(sortField)
      .limit(parseInt(limit))
      .select('address name stats reputation status');
    
    // Add rank
    const leaderboard = miners.map((miner, index) => ({
      rank: index + 1,
      address: miner.address,
      name: miner.name || `Miner ${miner.address.slice(0, 8)}`,
      completedTasks: miner.stats.completedTasks,
      successRate: miner.stats.completedTasks > 0 
        ? ((miner.stats.successfulTasks / miner.stats.completedTasks) * 100).toFixed(1)
        : 0,
      totalRewards: miner.stats.totalRewards,
      reputation: miner.reputation,
      status: miner.status
    }));
    
    res.json({ leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get task type distribution
router.get('/tasks/distribution', async (req, res) => {
  try {
    const distribution = await Task.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    res.json({ distribution });
  } catch (error) {
    console.error('Distribution error:', error);
    res.status(500).json({ error: 'Failed to get distribution' });
  }
});

module.exports = router;
