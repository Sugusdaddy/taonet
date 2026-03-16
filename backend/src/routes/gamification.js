const express = require('express');
const router = express.Router();
const Miner = require('../models/Miner');
const Reward = require('../models/Reward');
const Jackpot = require('../models/Jackpot');
const { ACHIEVEMENTS, checkAchievements, getAchievementsForMiner } = require('../achievements');

// ============ GAMIFICATION ROUTES ============

// Get miner's full gamification profile
router.get('/:address/profile', async (req, res) => {
  try {
    const { address } = req.params;
    const miner = await Miner.findOne({ address: address.toLowerCase() });
    
    if (!miner) {
      return res.status(404).json({ error: 'Miner not found' });
    }
    
    // Get achievements with status
    const achievements = getAchievementsForMiner(miner);
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalCount = achievements.length;
    
    // Calculate total multiplier
    const totalMultiplier = 
      miner.multipliers.staking * 
      miner.multipliers.streak * 
      miner.multipliers.level * 
      miner.multipliers.achievement * 
      miner.multipliers.event;
    
    res.json({
      address: miner.address,
      name: miner.name,
      
      // Level & XP
      level: miner.level,
      xp: miner.xp,
      xpToNextLevel: miner.xpToNextLevel,
      xpProgress: Math.round((miner.xp / miner.xpToNextLevel) * 100),
      
      // Staking
      stakingTier: miner.stakingTier,
      tokenBalance: miner.tokenBalance,
      
      // Streaks
      currentStreak: miner.currentStreak,
      longestStreak: miner.longestStreak,
      
      // Reputation
      reputation: miner.reputation,
      
      // Multipliers
      multipliers: {
        ...miner.multipliers,
        total: totalMultiplier.toFixed(2)
      },
      
      // Stats
      stats: miner.stats,
      
      // Achievements
      achievements: {
        unlocked: unlockedCount,
        total: totalCount,
        percentage: Math.round((unlockedCount / totalCount) * 100),
        recent: achievements
          .filter(a => a.unlocked)
          .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
          .slice(0, 5)
      },
      
      // Referral
      referralCode: miner.referralCode,
      referralCount: miner.referralCount,
      referralEarnings: miner.referralEarnings,
      
      // Daily bonus
      dailyBonus: miner.dailyBonus,
      
      // Status
      isOnline: global.activeMiners?.has(address.toLowerCase()) || false
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get all achievements
router.get('/achievements', (req, res) => {
  const byCategory = {};
  Object.values(ACHIEVEMENTS).forEach(a => {
    if (!byCategory[a.category]) {
      byCategory[a.category] = [];
    }
    byCategory[a.category].push(a);
  });
  
  res.json({
    total: Object.keys(ACHIEVEMENTS).length,
    byCategory
  });
});

// Get miner's achievements
router.get('/:address/achievements', async (req, res) => {
  try {
    const { address } = req.params;
    const miner = await Miner.findOne({ address: address.toLowerCase() });
    
    if (!miner) {
      return res.status(404).json({ error: 'Miner not found' });
    }
    
    const achievements = getAchievementsForMiner(miner);
    const byCategory = {};
    
    achievements.forEach(a => {
      if (!byCategory[a.category]) {
        byCategory[a.category] = [];
      }
      byCategory[a.category].push(a);
    });
    
    res.json({
      unlocked: achievements.filter(a => a.unlocked).length,
      total: achievements.length,
      byCategory
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

// Claim daily bonus
router.post('/:address/daily-bonus', async (req, res) => {
  try {
    const { address } = req.params;
    const miner = await Miner.findOne({ address: address.toLowerCase() });
    
    if (!miner) {
      return res.status(404).json({ error: 'Miner not found' });
    }
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const lastClaimed = miner.dailyBonus.lastClaimed;
    
    if (lastClaimed) {
      const lastClaimedDate = new Date(lastClaimed).toISOString().split('T')[0];
      if (lastClaimedDate === today) {
        return res.status(400).json({ error: 'Daily bonus already claimed today' });
      }
      
      // Check if consecutive
      const yesterday = new Date(now - 86400000).toISOString().split('T')[0];
      if (lastClaimedDate === yesterday) {
        miner.dailyBonus.consecutiveDays += 1;
      } else {
        miner.dailyBonus.consecutiveDays = 1;
      }
    } else {
      miner.dailyBonus.consecutiveDays = 1;
    }
    
    miner.dailyBonus.lastClaimed = now;
    
    // Calculate bonus based on consecutive days (max 7 days = 7x)
    const multiplier = Math.min(7, miner.dailyBonus.consecutiveDays);
    const baseBonus = BigInt('100000000000000000'); // 0.1 token
    const bonusAmount = (baseBonus * BigInt(multiplier)).toString();
    const xpBonus = 50 * multiplier;
    
    // Create reward
    const reward = new Reward({
      miner: miner.address,
      type: 'daily_bonus',
      amount: bonusAmount,
      xpEarned: xpBonus,
      status: 'pending',
      notes: `Day ${miner.dailyBonus.consecutiveDays} bonus`
    });
    await reward.save();
    
    // Add XP
    await miner.addXp(xpBonus);
    await miner.save();
    
    // Check achievements
    await checkAchievements(miner);
    
    res.json({
      success: true,
      consecutiveDays: miner.dailyBonus.consecutiveDays,
      multiplier,
      bonusAmount,
      xpEarned: xpBonus,
      nextBonusAt: new Date(now.setUTCHours(24, 0, 0, 0)).toISOString()
    });
  } catch (error) {
    console.error('Daily bonus error:', error);
    res.status(500).json({ error: 'Failed to claim daily bonus' });
  }
});

// Generate referral code
router.post('/:address/referral-code', async (req, res) => {
  try {
    const { address } = req.params;
    const miner = await Miner.findOne({ address: address.toLowerCase() });
    
    if (!miner) {
      return res.status(404).json({ error: 'Miner not found' });
    }
    
    const code = await miner.generateReferralCode();
    
    res.json({
      referralCode: code,
      referralLink: `https://taonet.fun/mine?ref=${code}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate referral code' });
  }
});

// Use referral code
router.post('/:address/use-referral', async (req, res) => {
  try {
    const { address } = req.params;
    const { referralCode } = req.body;
    
    if (!referralCode) {
      return res.status(400).json({ error: 'Referral code required' });
    }
    
    const miner = await Miner.findOne({ address: address.toLowerCase() });
    if (!miner) {
      return res.status(404).json({ error: 'Miner not found' });
    }
    
    if (miner.referredBy) {
      return res.status(400).json({ error: 'Already have a referrer' });
    }
    
    const referrer = await Miner.findOne({ referralCode: referralCode.toUpperCase() });
    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }
    
    if (referrer.address === miner.address) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }
    
    // Set referrer
    miner.referredBy = referrer.address;
    await miner.save();
    
    // Update referrer stats
    referrer.referralCount += 1;
    await referrer.save();
    
    // Check referrer achievements
    await checkAchievements(referrer);
    
    // Bonus for both
    const referralBonus = BigInt('500000000000000000'); // 0.5 tokens
    
    // Reward for new user
    await new Reward({
      miner: miner.address,
      type: 'referral',
      amount: referralBonus.toString(),
      xpEarned: 100,
      status: 'pending',
      notes: `Referral welcome bonus from ${referrer.address.slice(0, 8)}`
    }).save();
    
    // Reward for referrer
    await new Reward({
      miner: referrer.address,
      type: 'referral',
      amount: referralBonus.toString(),
      xpEarned: 100,
      status: 'pending',
      referredMiner: miner.address,
      notes: `Referral bonus for ${miner.address.slice(0, 8)}`
    }).save();
    
    res.json({
      success: true,
      referrer: referrer.address,
      bonusAmount: referralBonus.toString(),
      xpEarned: 100
    });
  } catch (error) {
    console.error('Referral error:', error);
    res.status(500).json({ error: 'Failed to use referral code' });
  }
});

// Get current jackpots
router.get('/jackpots/active', async (req, res) => {
  try {
    const jackpots = await Jackpot.find({ status: 'active' })
      .select('-entries')
      .sort({ type: 1 });
    
    res.json({
      jackpots: jackpots.map(j => ({
        id: j._id,
        type: j.type,
        poolAmount: j.poolAmount,
        progress: Math.round((j.currentCount / j.triggerAt) * 100),
        tasksUntilTrigger: j.triggerAt - j.currentCount,
        multiplier: j.multiplier
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get jackpots' });
  }
});

// Get jackpot history
router.get('/jackpots/history', async (req, res) => {
  try {
    const jackpots = await Jackpot.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(20);
    
    res.json({
      history: jackpots.map(j => ({
        id: j._id,
        type: j.type,
        winner: j.winner.address,
        amount: j.winner.amount,
        multiplier: j.multiplier,
        completedAt: j.completedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get jackpot history' });
  }
});

// Get miner's rewards history
router.get('/:address/rewards', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 20, type } = req.query;
    
    const query = { miner: address.toLowerCase() };
    if (type) query.type = type;
    
    const rewards = await Reward.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    const totals = await Reward.aggregate([
      { $match: { miner: address.toLowerCase() } },
      { 
        $group: { 
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: { $toLong: '$amount' } }
        }
      }
    ]);
    
    res.json({
      rewards,
      totals: totals.reduce((acc, t) => {
        acc[t._id] = { count: t.count, total: t.total.toString() };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Rewards error:', error);
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

// Get XP leaderboard
router.get('/leaderboard/xp', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const miners = await Miner.find()
      .sort({ level: -1, xp: -1 })
      .limit(parseInt(limit))
      .select('address name level xp stakingTier reputation stats.completedTasks');
    
    res.json({
      leaderboard: miners.map((m, i) => ({
        rank: i + 1,
        address: m.address,
        name: m.name,
        level: m.level,
        xp: m.xp,
        stakingTier: m.stakingTier,
        reputation: m.reputation,
        tasksCompleted: m.stats.completedTasks
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Get streak leaderboard
router.get('/leaderboard/streaks', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const miners = await Miner.find()
      .sort({ currentStreak: -1 })
      .limit(parseInt(limit))
      .select('address name currentStreak longestStreak level');
    
    res.json({
      leaderboard: miners.map((m, i) => ({
        rank: i + 1,
        address: m.address,
        name: m.name,
        currentStreak: m.currentStreak,
        longestStreak: m.longestStreak,
        level: m.level
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get streak leaderboard' });
  }
});

module.exports = router;
