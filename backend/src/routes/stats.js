const express = require('express');
const router = express.Router();
const Miner = require('../models/Miner');
const Task = require('../models/Task');
const InferenceProof = require('../models/InferenceProof');
const Knowledge = require('../models/Knowledge');

router.get('/', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalMiners,
      minersOnline,
      totalProofs,
      proofsToday,
      totalTasks,
      tasksToday,
      knowledgeCount,
      avgResponseTime
    ] = await Promise.all([
      Miner.countDocuments(),
      Miner.countDocuments({ status: 'online' }),
      InferenceProof.countDocuments(),
      InferenceProof.countDocuments({ timestamp: { $gte: today } }),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'completed', completedAt: { $gte: today } }),
      Knowledge.countDocuments({ answer: { $exists: true, $ne: '' } }),
      InferenceProof.aggregate([
        { $match: { processingTime: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$processingTime' } } }
      ])
    ]);
    
    // Calculate total rewards distributed
    const rewardsAgg = await Miner.aggregate([
      { $group: { _id: null, total: { $sum: { $toLong: '$stats.totalRewards' } } } }
    ]);
    
    // Get last anchor info
    const lastAnchor = await InferenceProof.findOne({ anchoredToSolana: true }).sort({ blockHeight: -1 });
    
    // Count WebSocket connections
    const wsOnline = global.activeMiners?.size || 0;
    
    res.json({
      totalMiners,
      minersOnline: Math.max(minersOnline, wsOnline),
      totalProofs,
      proofsToday,
      totalTasks,
      tasksToday,
      knowledgeCount,
      avgResponseTime: Math.round(avgResponseTime[0]?.avg || 0),
      totalRewards: rewardsAgg[0]?.total?.toString() || '0',
      lastAnchorBlock: lastAnchor?.blockHeight || null,
      totalAnchors: await InferenceProof.countDocuments({ anchoredToSolana: true }),
      network: 'devnet'
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
