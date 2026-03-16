const Miner = require('../models/Miner');
const Reward = require('../models/Reward');
const RewardEngine = require('../services/rewardEngine');

class MinerController {
  // Register new miner
  static async register(req, res) {
    try {
      const { address, name, hardware } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: 'Address required' });
      }
      
      const normalizedAddress = address.toLowerCase();
      
      let miner = await Miner.findOne({ address: normalizedAddress });
      
      if (miner) {
        if (name) miner.name = name;
        if (hardware) miner.hardware = hardware;
        miner.lastSeen = new Date();
        await miner.save();
      } else {
        miner = new Miner({
          address: normalizedAddress,
          name: name || '',
          hardware: hardware || {}
        });
        await miner.generateReferralCode();
      }
      
      res.json({
        success: true,
        miner: {
          address: miner.address,
          name: miner.name,
          level: miner.level,
          xp: miner.xp,
          reputation: miner.reputation,
          stakingTier: miner.stakingTier,
          referralCode: miner.referralCode,
          stats: miner.stats,
          multipliers: miner.multipliers
        }
      });
    } catch (error) {
      console.error('Miner register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
  
  // Get miner profile
  static async getProfile(req, res) {
    try {
      const { address } = req.params;
      const miner = await Miner.findOne({ address: address.toLowerCase() });
      
      if (!miner) {
        return res.status(404).json({ error: 'Miner not found' });
      }
      
      const recentRewards = await Reward.find({ miner: miner.address })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      
      const totalMultiplier = (
        (miner.multipliers?.staking || 1) * 
        (miner.multipliers?.streak || 1) * 
        (miner.multipliers?.level || 1) * 
        (miner.multipliers?.achievement || 1)
      ).toFixed(2);
      
      res.json({
        address: miner.address,
        name: miner.name,
        level: miner.level,
        xp: miner.xp,
        xpToNextLevel: miner.xpToNextLevel,
        xpProgress: ((miner.xp / miner.xpToNextLevel) * 100).toFixed(1),
        reputation: miner.reputation,
        stakingTier: miner.stakingTier,
        tokenBalance: miner.tokenBalance,
        currentStreak: miner.currentStreak,
        longestStreak: miner.longestStreak,
        referralCode: miner.referralCode,
        referralCount: miner.referralCount,
        stats: miner.stats,
        multipliers: miner.multipliers,
        totalMultiplier,
        achievements: miner.achievements,
        recentRewards,
        createdAt: miner.createdAt
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
  
  // Enhanced leaderboard
  static async getLeaderboard(req, res) {
    try {
      const { 
        sortBy = 'composite',
        limit = 50,
        timeframe = 'all'
      } = req.query;
      
      const leaderboard = await RewardEngine.getLeaderboard({
        sortBy,
        limit: parseInt(limit),
        timeframe
      });
      
      res.json({
        leaderboard,
        meta: {
          sortBy,
          timeframe,
          count: leaderboard.length,
          sortOptions: ['composite', 'rewards', 'tasks', 'efficiency', 'level', 'streak', 'reputation'],
          timeframeOptions: ['day', 'week', 'month', 'all']
        }
      });
    } catch (error) {
      console.error('Leaderboard error:', error);
      res.status(500).json({ error: 'Failed to get leaderboard' });
    }
  }
  
  // Get active miners
  static async getActiveMiners(req, res) {
    try {
      const miners = await Miner.find({ status: 'online' })
        .select('address name level reputation stakingTier stats.completedTasks')
        .lean();
      
      res.json({
        count: miners.length,
        miners: miners.map(m => ({
          address: m.address,
          name: m.name || m.address.slice(0, 8),
          level: m.level,
          reputation: m.reputation,
          stakingTier: m.stakingTier,
          tasksCompleted: m.stats?.completedTasks || 0
        }))
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get active miners' });
    }
  }
  
  // Get miner info
  static async getInfo(req, res) {
    try {
      const { address } = req.params;
      const miner = await Miner.findOne({ address: address.toLowerCase() });
      
      if (!miner) {
        return res.status(404).json({ error: 'Miner not found' });
      }
      
      res.json({
        address: miner.address,
        name: miner.name,
        level: miner.level,
        xp: miner.xp,
        reputation: miner.reputation,
        stakingTier: miner.stakingTier,
        currentStreak: miner.currentStreak,
        stats: miner.stats,
        multipliers: miner.multipliers,
        status: miner.status
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get miner info' });
    }
  }
  
  // Get miner stats
  static async getStats(req, res) {
    try {
      const { address } = req.params;
      const miner = await Miner.findOne({ address: address.toLowerCase() });
      
      if (!miner) {
        return res.status(404).json({ error: 'Miner not found' });
      }
      
      const rewards = await Reward.find({ miner: miner.address })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      
      const dailyEarnings = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const dayRewards = rewards.filter(r => {
          const created = new Date(r.createdAt);
          return created >= dayStart && created <= dayEnd;
        });
        
        const total = dayRewards.reduce((sum, r) => sum + BigInt(r.amount || '0'), BigInt(0));
        
        dailyEarnings.push({
          date: dayStart.toISOString().split('T')[0],
          rewards: total.toString(),
          tasks: dayRewards.length
        });
      }
      
      res.json({
        address: miner.address,
        stats: miner.stats,
        dailyEarnings: dailyEarnings.reverse(),
        multipliers: miner.multipliers,
        achievements: miner.achievements.length,
        level: miner.level,
        reputation: miner.reputation
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }
}

module.exports = MinerController;
