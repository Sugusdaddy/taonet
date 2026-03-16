const express = require('express');
const router = express.Router();
const Miner = require('../models/Miner');
const Task = require('../models/Task');
const Reward = require('../models/Reward');
const Validation = require('../models/Validation');
const os = require('os');

// Detailed health check
router.get('/health', async (req, res) => {
  try {
    const mongoStatus = require('mongoose').connection.readyState;
    const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    res.json({
      status: mongoStatus === 1 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        mongodb: mongoStates[mongoStatus] || 'unknown',
        websocket: global.activeMiners ? 'active' : 'inactive',
        activeConnections: global.activeMiners?.size || 0
      },
      system: {
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usedPercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
        },
        cpu: os.loadavg(),
        platform: os.platform(),
        nodeVersion: process.version
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Prometheus-style metrics
router.get('/metrics', async (req, res) => {
  try {
    const [
      totalMiners,
      onlineMiners,
      totalTasks,
      completedTasks,
      pendingTasks,
      totalRewards,
      totalValidations
    ] = await Promise.all([
      Miner.countDocuments(),
      Miner.countDocuments({ status: { $in: ['online', 'busy'] } }),
      Task.countDocuments(),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'pending' }),
      Reward.aggregate([
        { $match: { status: 'distributed' } },
        { $group: { _id: null, total: { $sum: { $toLong: '$amount' } } } }
      ]),
      Validation.countDocuments()
    ]);
    
    const metrics = `
# HELP taonet_miners_total Total number of registered miners
# TYPE taonet_miners_total gauge
taonet_miners_total ${totalMiners}

# HELP taonet_miners_online Number of online miners
# TYPE taonet_miners_online gauge
taonet_miners_online ${onlineMiners}

# HELP taonet_miners_connected WebSocket connected miners
# TYPE taonet_miners_connected gauge
taonet_miners_connected ${global.activeMiners?.size || 0}

# HELP taonet_tasks_total Total number of tasks
# TYPE taonet_tasks_total counter
taonet_tasks_total ${totalTasks}

# HELP taonet_tasks_completed Number of completed tasks
# TYPE taonet_tasks_completed counter
taonet_tasks_completed ${completedTasks}

# HELP taonet_tasks_pending Number of pending tasks
# TYPE taonet_tasks_pending gauge
taonet_tasks_pending ${pendingTasks}

# HELP taonet_rewards_distributed Total rewards distributed
# TYPE taonet_rewards_distributed counter
taonet_rewards_distributed ${totalRewards[0]?.total || 0}

# HELP taonet_validations_total Total validations performed
# TYPE taonet_validations_total counter
taonet_validations_total ${totalValidations}

# HELP taonet_uptime_seconds Server uptime in seconds
# TYPE taonet_uptime_seconds gauge
taonet_uptime_seconds ${Math.floor(process.uptime())}

# HELP taonet_memory_used_bytes Memory used by process
# TYPE taonet_memory_used_bytes gauge
taonet_memory_used_bytes ${process.memoryUsage().heapUsed}
`.trim();
    
    res.type('text/plain').send(metrics);
  } catch (error) {
    res.status(500).send(`# Error: ${error.message}`);
  }
});

// Network overview
router.get('/overview', async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    
    const [
      totalMiners,
      newMinersToday,
      activeMinersLastHour,
      totalTasks,
      tasksToday,
      tasksLastHour,
      tasksByType,
      topMiners
    ] = await Promise.all([
      Miner.countDocuments(),
      Miner.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Miner.countDocuments({ lastSeen: { $gte: oneHourAgo } }),
      Task.countDocuments(),
      Task.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      Task.countDocuments({ createdAt: { $gte: oneHourAgo } }),
      Task.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Miner.find()
        .sort({ 'stats.completedTasks': -1 })
        .limit(5)
        .select('address name stats.completedTasks reputation')
    ]);
    
    // Calculate success rate
    const completedTasks = await Task.countDocuments({ status: 'completed' });
    const failedTasks = await Task.countDocuments({ status: { $in: ['failed', 'expired'] } });
    const successRate = totalTasks > 0 
      ? ((completedTasks / totalTasks) * 100).toFixed(2)
      : 0;
    
    res.json({
      network: {
        totalMiners,
        newMinersToday,
        activeMinersLastHour,
        onlineNow: global.activeMiners?.size || 0
      },
      tasks: {
        total: totalTasks,
        today: tasksToday,
        lastHour: tasksLastHour,
        successRate: parseFloat(successRate),
        byType: tasksByType.reduce((acc, t) => {
          acc[t._id] = t.count;
          return acc;
        }, {})
      },
      topMiners: topMiners.map(m => ({
        address: m.address,
        name: m.name,
        tasks: m.stats.completedTasks,
        reputation: m.reputation
      })),
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ error: 'Failed to get overview' });
  }
});

module.exports = router;
