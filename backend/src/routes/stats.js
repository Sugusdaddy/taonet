const express = require('express');
const router = express.Router();
const Miner = require('../models/Miner');
const Task = require('../models/Task');
const InferenceProof = require('../models/InferenceProof');
const Knowledge = require('../models/Knowledge');
const Airdrop = require('../models/Airdrop');

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
    
    // Calculate total rewards in JS (not MongoDB aggregate) to handle big numbers
    const miners = await Miner.find({}, { 'stats.totalRewards': 1 }).lean();
    let totalRewards = BigInt(0);
    for (const m of miners) {
      try {
        if (m.stats?.totalRewards) {
          totalRewards += BigInt(m.stats.totalRewards);
        }
      } catch (e) {
        // Skip invalid numbers
      }
    }
    
    // Get last anchor info
    const lastAnchor = await InferenceProof.findOne({ anchoredToSolana: true }).sort({ blockHeight: -1 });
    
    // Airdrop stats
    const airdropPending = await Airdrop.countDocuments({ status: 'pending' }).catch(() => 0);
    const airdropCompleted = await Airdrop.countDocuments({ status: 'completed' }).catch(() => 0);
    
    // Count WebSocket connections
    const wsOnline = global.activeMiners?.size || 0;
    
    res.json({
      network: {
        totalMiners,
        onlineMiners: Math.max(minersOnline, wsOnline)
      },
      chain: {
        height: totalProofs,
        proofsToday
      },
      tasks: {
        completed: totalTasks,
        today: tasksToday
      },
      rewards: {
        totalDistributed: totalRewards.toString()
      },
      knowledge: {
        count: knowledgeCount
      },
      airdrops: {
        pending: airdropPending,
        completed: airdropCompleted
      },
      performance: {
        avgResponseTime: Math.round(avgResponseTime[0]?.avg || 0)
      },
      anchor: {
        lastBlock: lastAnchor?.blockHeight || null,
        total: await InferenceProof.countDocuments({ anchoredToSolana: true }),
        network: 'devnet'
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
