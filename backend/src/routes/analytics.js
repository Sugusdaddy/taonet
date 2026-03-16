const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const Miner = require('../models/Miner');
const Task = require('../models/Task');
const Reward = require('../models/Reward');

// Get current analytics snapshot
router.get('/snapshot', async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    // Current network state
    const totalMiners = await Miner.countDocuments();
    const activeMiners = await Miner.countDocuments({ isActive: true });
    const onlineMiners = global.activeMiners?.size || 0;
    
    // Tier distribution
    const tierAgg = await Miner.aggregate([
      { $group: { _id: '$stakingTier', count: { $sum: 1 } } }
    ]);
    const tierDistribution = {};
    tierAgg.forEach(t => tierDistribution[t._id] = t.count);
    
    // Tasks 24h
    const tasks24h = await Task.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgTime: { $avg: '$responseTime' }
      }}
    ]);
    
    // Tasks by type 24h
    const tasksByType = await Task.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      { $group: {
        _id: '$type',
        submitted: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        avgTime: { $avg: '$responseTime' }
      }}
    ]);
    
    // Rewards 24h
    const rewards24h = await Reward.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      { $group: {
        _id: '$type',
        total: { $sum: { $toLong: '$amount' } },
        count: { $sum: 1 }
      }}
    ]);
    
    // Growth metrics
    const newMiners24h = await Miner.countDocuments({ createdAt: { $gte: oneDayAgo } });
    const newMinersWeek = await Miner.countDocuments({ createdAt: { $gte: oneWeekAgo } });
    
    // Gamification stats
    const achievementsUnlocked24h = await Miner.aggregate([
      { $unwind: '$achievements' },
      { $match: { 'achievements.unlockedAt': { $gte: oneDayAgo } } },
      { $count: 'total' }
    ]);
    
    const avgStreak = await Miner.aggregate([
      { $match: { currentStreak: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: '$currentStreak' }, count: { $sum: 1 } } }
    ]);
    
    res.json({
      timestamp: now,
      network: {
        totalMiners,
        activeMiners,
        onlineMiners,
        newMiners24h,
        newMinersWeek,
        tierDistribution
      },
      tasks: {
        summary24h: tasks24h,
        byType24h: tasksByType
      },
      rewards: {
        summary24h: rewards24h
      },
      gamification: {
        achievementsUnlocked24h: achievementsUnlocked24h[0]?.total || 0,
        activeStreaks: avgStreak[0]?.count || 0,
        avgStreakLength: Math.round(avgStreak[0]?.avg || 0)
      }
    });
  } catch (error) {
    console.error('Analytics snapshot error:', error);
    res.status(500).json({ error: 'Failed to get analytics snapshot' });
  }
});

// Get historical analytics
router.get('/history', async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const analytics = await Analytics.find({
      period,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: 1 });
    
    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get analytics history' });
  }
});

// Get task analytics
router.get('/tasks', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const startTime = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
    
    // Hourly breakdown
    const hourlyTasks = await Task.aggregate([
      { $match: { createdAt: { $gte: startTime } } },
      { $group: {
        _id: {
          hour: { $hour: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        submitted: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' },
        avgQuality: { $avg: '$qualityScore' }
      }},
      { $sort: { '_id.day': 1, '_id.hour': 1 } }
    ]);
    
    // Success rate trend
    const successRate = hourlyTasks.map(h => ({
      hour: `${h._id.day}-${h._id.hour}:00`,
      rate: h.submitted > 0 ? Math.round(h.completed / h.submitted * 100) : 0
    }));
    
    // Response time distribution
    const responseTimeDistribution = await Task.aggregate([
      { $match: { createdAt: { $gte: startTime }, status: 'completed' } },
      { $bucket: {
        groupBy: '$responseTime',
        boundaries: [0, 1000, 2000, 5000, 10000, 30000, 60000, Infinity],
        default: 'other',
        output: { count: { $sum: 1 } }
      }}
    ]);
    
    res.json({
      hourlyBreakdown: hourlyTasks,
      successRateTrend: successRate,
      responseTimeDistribution
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get task analytics' });
  }
});

// Get miner analytics
router.get('/miners', async (req, res) => {
  try {
    // Top performers
    const topByTasks = await Miner.find()
      .sort({ tasksCompleted: -1 })
      .limit(10)
      .select('address name tasksCompleted reputation stakingTier');
    
    const topByReputation = await Miner.find()
      .sort({ reputation: -1 })
      .limit(10)
      .select('address name tasksCompleted reputation stakingTier');
    
    const topByXP = await Miner.find()
      .sort({ xp: -1 })
      .limit(10)
      .select('address name level xp stakingTier');
    
    const topByStreak = await Miner.find({ currentStreak: { $gt: 0 } })
      .sort({ currentStreak: -1 })
      .limit(10)
      .select('address name currentStreak longestStreak');
    
    // Activity distribution
    const activityDistribution = await Miner.aggregate([
      { $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $eq: ['$tasksCompleted', 0] }, then: 'inactive' },
              { case: { $lte: ['$tasksCompleted', 10] }, then: 'beginner' },
              { case: { $lte: ['$tasksCompleted', 100] }, then: 'active' },
              { case: { $lte: ['$tasksCompleted', 1000] }, then: 'veteran' }
            ],
            default: 'whale'
          }
        },
        count: { $sum: 1 }
      }}
    ]);
    
    // Level distribution
    const levelDistribution = await Miner.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      topPerformers: {
        byTasks: topByTasks,
        byReputation: topByReputation,
        byXP: topByXP,
        byStreak: topByStreak
      },
      distributions: {
        activity: activityDistribution,
        level: levelDistribution
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get miner analytics' });
  }
});

// Get reward analytics
router.get('/rewards', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Daily rewards
    const dailyRewards = await Reward.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          type: '$type'
        },
        total: { $sum: { $toLong: '$amount' } },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.day': 1 } }
    ]);
    
    // Top earners
    const topEarners = await Reward.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: '$miner',
        totalRewards: { $sum: { $toLong: '$amount' } },
        taskRewards: { $sum: { $cond: [{ $eq: ['$type', 'task'] }, { $toLong: '$amount' }, 0] } },
        bonusRewards: { $sum: { $cond: [{ $ne: ['$type', 'task'] }, { $toLong: '$amount' }, 0] } }
      }},
      { $sort: { totalRewards: -1 } },
      { $limit: 20 }
    ]);
    
    res.json({
      dailyRewards,
      topEarners
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get reward analytics' });
  }
});

// Aggregate and store analytics (called by cron)
async function aggregateAnalytics(period = 'hourly') {
  try {
    const now = new Date();
    let startTime, endTime;
    
    if (period === 'hourly') {
      startTime = new Date(now);
      startTime.setMinutes(0, 0, 0);
      startTime.setHours(startTime.getHours() - 1);
      endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);
    } else if (period === 'daily') {
      startTime = new Date(now);
      startTime.setHours(0, 0, 0, 0);
      startTime.setDate(startTime.getDate() - 1);
      endTime = new Date(startTime);
      endTime.setDate(endTime.getDate() + 1);
    }
    
    // Gather metrics
    const totalMiners = await Miner.countDocuments();
    const activeMiners = await Miner.countDocuments({ isActive: true });
    const newMiners = await Miner.countDocuments({ 
      createdAt: { $gte: startTime, $lt: endTime } 
    });
    
    const tierAgg = await Miner.aggregate([
      { $group: { _id: '$stakingTier', count: { $sum: 1 } } }
    ]);
    const tierDistribution = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
    tierAgg.forEach(t => tierDistribution[t._id] = t.count);
    
    const taskStats = await Task.aggregate([
      { $match: { createdAt: { $gte: startTime, $lt: endTime } } },
      { $group: {
        _id: null,
        submitted: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' },
        avgQuality: { $avg: '$qualityScore' }
      }}
    ]);
    
    const rewardStats = await Reward.aggregate([
      { $match: { createdAt: { $gte: startTime, $lt: endTime } } },
      { $group: {
        _id: '$type',
        total: { $sum: { $toLong: '$amount' } }
      }}
    ]);
    
    let totalDistributed = BigInt(0);
    const byType = { task: '0', streak: '0', achievement: '0', referral: '0', jackpot: '0', tournament: '0' };
    rewardStats.forEach(r => {
      totalDistributed += BigInt(r.total);
      byType[r._id] = r.total.toString();
    });
    
    // Save analytics
    const analytics = new Analytics({
      period,
      timestamp: startTime,
      network: {
        totalMiners,
        activeMiners,
        newMiners,
        tierDistribution
      },
      tasks: {
        submitted: taskStats[0]?.submitted || 0,
        completed: taskStats[0]?.completed || 0,
        failed: taskStats[0]?.failed || 0,
        avgResponseTime: Math.round(taskStats[0]?.avgResponseTime || 0),
        avgQualityScore: Math.round(taskStats[0]?.avgQuality || 0),
        successRate: taskStats[0]?.submitted > 0 
          ? Math.round(taskStats[0].completed / taskStats[0].submitted * 100) 
          : 0
      },
      rewards: {
        totalDistributed: totalDistributed.toString(),
        byType
      }
    });
    
    await analytics.save();
    console.log(`Analytics aggregated for ${period} at ${startTime}`);
    
    return analytics;
  } catch (error) {
    console.error('Analytics aggregation error:', error);
  }
}

module.exports = router;
module.exports.aggregateAnalytics = aggregateAnalytics;
