const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Miner = require('../models/Miner');
const { Parser } = require('json2csv');

// Export tasks
router.get('/tasks', async (req, res) => {
  try {
    const { format = 'json', status, type, from, to, limit = 1000 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    
    const tasks = await Task.find(query)
      .select('type status prompt requester createdAt completedAt')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    
    if (format === 'csv') {
      const fields = ['_id', 'type', 'status', 'prompt', 'requester', 'createdAt', 'completedAt'];
      const parser = new Parser({ fields });
      const csv = parser.parse(tasks);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=taonet-tasks.csv');
      return res.send(csv);
    }
    
    res.json({ tasks, count: tasks.length });
  } catch (error) {
    console.error('Export tasks error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export miners
router.get('/miners', async (req, res) => {
  try {
    const { format = 'json', tier, limit = 1000 } = req.query;
    
    const query = {};
    if (tier) query.stakingTier = tier;
    
    const miners = await Miner.find(query)
      .select('address name reputation stakingTier tasksCompleted totalRewards currentStreak level xp createdAt')
      .sort({ reputation: -1 })
      .limit(Number(limit))
      .lean();
    
    if (format === 'csv') {
      const fields = ['address', 'name', 'reputation', 'stakingTier', 'tasksCompleted', 'totalRewards', 'currentStreak', 'level', 'xp', 'createdAt'];
      const parser = new Parser({ fields });
      const csv = parser.parse(miners);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=taonet-miners.csv');
      return res.send(csv);
    }
    
    res.json({ miners, count: miners.length });
  } catch (error) {
    console.error('Export miners error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export analytics summary
router.get('/analytics', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    const hours = period === '7d' ? 168 : period === '30d' ? 720 : 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Aggregate stats
    const taskStats = await Task.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);
    
    const minerStats = await Miner.aggregate([
      { $group: {
        _id: '$stakingTier',
        count: { $sum: 1 },
        avgReputation: { $avg: '$reputation' },
        totalTasks: { $sum: '$tasksCompleted' }
      }}
    ]);
    
    const topMiners = await Miner.find()
      .select('address name reputation tasksCompleted')
      .sort({ reputation: -1 })
      .limit(10)
      .lean();
    
    res.json({
      period,
      tasks: taskStats,
      miners: minerStats,
      topMiners,
      exportedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// Export miner history
router.get('/miner/:address/history', async (req, res) => {
  try {
    const { format = 'json', limit = 500 } = req.query;
    
    const tasks = await Task.find({
      $or: [
        { 'responses.miner': req.params.address },
        { 'bestResponse.miner': req.params.address }
      ]
    })
      .select('type status prompt createdAt completedAt bestResponse')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    
    // Add reward info
    const history = tasks.map(t => ({
      taskId: t._id,
      type: t.type,
      status: t.status,
      prompt: t.prompt?.slice(0, 100),
      wasWinner: t.bestResponse?.miner === req.params.address,
      score: t.bestResponse?.miner === req.params.address ? t.bestResponse.score : null,
      createdAt: t.createdAt,
      completedAt: t.completedAt
    }));
    
    if (format === 'csv') {
      const fields = ['taskId', 'type', 'status', 'prompt', 'wasWinner', 'score', 'createdAt', 'completedAt'];
      const parser = new Parser({ fields });
      const csv = parser.parse(history);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=miner-${req.params.address.slice(0, 8)}-history.csv`);
      return res.send(csv);
    }
    
    res.json({ history, count: history.length });
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
