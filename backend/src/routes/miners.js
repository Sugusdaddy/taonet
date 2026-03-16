const express = require("express");
const router = express.Router();
const MinerController = require("../controllers/minerController");

// Register a new miner
router.post("/register", MinerController.register);

// Get leaderboard (MUST be before /:address)
router.get("/leaderboard", MinerController.getLeaderboard);

// Get active miners
router.get("/active", MinerController.getActiveMiners);

// Get miner info
router.get("/:address", MinerController.getInfo);

// Get miner dashboard
router.get("/:address/dashboard", async (req, res) => {
  try {
    const { address } = req.params;
    const Miner = require("../models/Miner");
    const Task = require("../models/Task");
    const Reward = require("../models/Reward");
    
    const miner = await Miner.findOne({ address: address.toLowerCase() });
    if (!miner) {
      return res.status(404).json({ error: "Miner not found" });
    }
    
    const recentTasks = await Task.find({ 
      "responses.miner": address.toLowerCase() 
    }).sort({ createdAt: -1 }).limit(10);
    
    const pendingRewards = await Reward.find({
      miner: address.toLowerCase(),
      status: "pending"
    });
    
    const pendingTotal = pendingRewards.reduce((sum, r) => sum + BigInt(r.amount), 0n);
    
    const rewardHistory = await Reward.find({
      miner: address.toLowerCase()
    }).sort({ createdAt: -1 }).limit(20);
    
    const tasksWithMiner = await Task.find({
      "responses.miner": address.toLowerCase(),
      status: "completed"
    });
    
    let totalScore = 0, scoreCount = 0;
    for (const task of tasksWithMiner) {
      const response = task.responses.find(r => r.miner === address.toLowerCase());
      if (response?.score) {
        totalScore += response.score;
        scoreCount++;
      }
    }
    
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
        averageScore: Math.round(scoreCount > 0 ? totalScore / scoreCount : 0)
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
      isOnline: global.activeMiners?.has(address.toLowerCase()) || false
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to get dashboard" });
  }
});

// Get miner rank
router.get("/:address/rank", async (req, res) => {
  try {
    const Miner = require("../models/Miner");
    const miners = await Miner.find().sort({ "stats.totalRewards": -1 });
    const idx = miners.findIndex(m => m.address === req.params.address.toLowerCase());
    res.json({ rank: idx >= 0 ? idx + 1 : null });
  } catch (e) {
    res.status(500).json({ error: "Failed to get rank" });
  }
});

// Get miner history
router.get("/:address/history", async (req, res) => {
  try {
    const Task = require("../models/Task");
    const { page = 1, limit = 20 } = req.query;
    
    const tasks = await Task.find({
      "responses.miner": req.params.address.toLowerCase(),
      status: "completed"
    })
      .sort({ completedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Task.countDocuments({
      "responses.miner": req.params.address.toLowerCase(),
      status: "completed"
    });
    
    res.json({
      history: tasks.map(t => {
        const resp = t.responses.find(r => r.miner === req.params.address.toLowerCase());
        return {
          taskId: t._id,
          completedAt: t.completedAt,
          qualityScore: resp?.score,
          responseTime: resp?.responseTime,
          reward: resp?.reward || 10,
          jackpot: resp?.jackpot
        };
      }),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to get history" });
  }
});

// Get miner referrals
router.get("/:address/referrals", async (req, res) => {
  try {
    const Miner = require("../models/Miner");
    const miner = await Miner.findOne({ address: req.params.address.toLowerCase() });
    if (!miner) return res.status(404).json({ error: "Miner not found" });
    
    const referrals = await Miner.find({ referredBy: miner.referralCode });
    
    res.json({
      totalReferrals: referrals.length,
      activeReferrals: referrals.filter(r => r.status === "active").length,
      totalEarned: miner.stats?.referralEarnings || 0,
      referrals: referrals.map(r => ({
        name: r.name,
        address: r.address,
        earned: r.stats?.totalRewards || 0,
        createdAt: r.createdAt
      }))
    });
  } catch (e) {
    res.status(500).json({ error: "Failed to get referrals" });
  }
});

module.exports = router;
