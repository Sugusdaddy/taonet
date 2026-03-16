/**
 * TaoNet Reward Engine v2.1
 * Fixed: No BigInt in MongoDB aggregates
 */

const Miner = require('../models/Miner');
const Reward = require('../models/Reward');

// Base reward per task (in wei - 1 token = 1e18 wei)
const BASE_REWARD = BigInt('1000000000000000000'); // 1 token

// XP needed per level
const XP_PER_LEVEL = [
  0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000,
  17000, 24000, 33000, 45000, 60000, 80000, 105000, 135000, 175000, 225000
];

class RewardEngine {
  /**
   * Calculate reward - accepts flexible input
   */
  static calculateReward(input) {
    if (input.baseReward !== undefined) {
      return this.calculateFromConfig(input);
    }
    const { task, miner, response } = input;
    return this.calculateFromConfig({
      baseReward: BigInt(task?.rewardPool || BASE_REWARD),
      miner,
      responseTime: response?.responseTime || 5000,
      qualityScore: response?.score || 50,
      taskType: task?.type || 'text'
    });
  }
  
  static calculateFromConfig({ baseReward, miner, responseTime, qualityScore, taskType }) {
    const base = typeof baseReward === 'bigint' ? baseReward : BigInt(baseReward || BASE_REWARD);
    
    let multiplier = 1.0;
    const breakdown = { base: base.toString(), multipliers: {} };
    
    // Speed bonus
    if (responseTime < 500) { multiplier += 0.5; breakdown.multipliers.speed = '+50%'; }
    else if (responseTime < 2000) { multiplier += 0.3; breakdown.multipliers.speed = '+30%'; }
    else if (responseTime < 5000) { multiplier += 0.1; breakdown.multipliers.speed = '+10%'; }
    
    // Quality bonus
    if (qualityScore >= 90) { multiplier += 0.4; breakdown.multipliers.quality = '+40%'; }
    else if (qualityScore >= 75) { multiplier += 0.2; breakdown.multipliers.quality = '+20%'; }
    else if (qualityScore < 50) { multiplier -= 0.2; breakdown.multipliers.quality = '-20%'; }
    
    // Miner level bonus (+2% per level)
    if (miner?.level > 1) {
      const levelBonus = (miner.level - 1) * 0.02;
      multiplier += levelBonus;
      breakdown.multipliers.level = `+${(levelBonus * 100).toFixed(0)}%`;
    }
    
    // Streak bonus
    const streak = miner?.currentStreak || 0;
    if (streak >= 100) { multiplier += 0.75; breakdown.multipliers.streak = '+75%'; }
    else if (streak >= 60) { multiplier += 0.5; breakdown.multipliers.streak = '+50%'; }
    else if (streak >= 30) { multiplier += 0.35; breakdown.multipliers.streak = '+35%'; }
    else if (streak >= 14) { multiplier += 0.2; breakdown.multipliers.streak = '+20%'; }
    else if (streak >= 7) { multiplier += 0.1; breakdown.multipliers.streak = '+10%'; }
    
    // Staking tier multiplier
    const stakingMult = miner?.multipliers?.staking || 1.0;
    if (stakingMult > 1) { multiplier *= stakingMult; breakdown.multipliers.staking = `x${stakingMult}`; }
    
    // Task type multiplier
    const typeMultipliers = { text: 1.0, code: 1.5, image: 1.3, trading: 2.0, custom: 1.2 };
    const typeMult = typeMultipliers[taskType] || 1.0;
    if (typeMult !== 1.0) { multiplier *= typeMult; breakdown.multipliers.taskType = `x${typeMult}`; }
    
    const finalReward = BigInt(Math.floor(Number(base) * multiplier));
    
    // Calculate XP
    let xpEarned = 10;
    if (responseTime < 500) xpEarned += 15;
    else if (responseTime < 2000) xpEarned += 10;
    else if (responseTime < 5000) xpEarned += 5;
    
    if (qualityScore >= 90) xpEarned += 20;
    else if (qualityScore >= 75) xpEarned += 10;
    else if (qualityScore >= 50) xpEarned += 5;
    
    breakdown.totalMultiplier = multiplier.toFixed(2);
    breakdown.finalReward = finalReward.toString();
    
    return { finalReward, xpEarned, multiplier, breakdown };
  }
  
  static getXpForLevel(level) {
    if (level <= 0) return 0;
    if (level <= XP_PER_LEVEL.length) return XP_PER_LEVEL[level - 1];
    return Math.floor(XP_PER_LEVEL[XP_PER_LEVEL.length - 1] * Math.pow(1.3, level - 20));
  }
  
  static calculateXP(task, response) {
    let xp = 10;
    const rt = response?.responseTime || 5000;
    if (rt < 500) xp += 15;
    else if (rt < 2000) xp += 10;
    else if (rt < 5000) xp += 5;
    
    const score = response?.score || 50;
    if (score >= 90) xp += 20;
    else if (score >= 75) xp += 10;
    else if (score >= 50) xp += 5;
    
    return xp;
  }
  
  static updateReputation(miner, score, wasSuccessful) {
    let delta = wasSuccessful ? (score >= 90 ? 2 : score >= 75 ? 1 : 0.5) : -2;
    miner.reputation = Math.max(0, Math.min(100, (miner.reputation || 50) + delta));
    return miner.reputation;
  }
  
  /**
   * Get leaderboard - no BigInt in aggregates
   */
  static async getLeaderboard(options = {}) {
    const { sortBy = 'composite', limit = 50, timeframe = 'all' } = options;
    
    // Simple query instead of aggregate
    const miners = await Miner.find({
      'stats.completedTasks': { $gt: 0 }
    }).lean();
    
    // Process in JS
    const scored = miners.map(m => {
      // Safe number conversion for rewards (stored as string)
      const rewardsStr = m.stats?.totalRewards || '0';
      let rewardsNum = 0;
      try {
        // Convert from wei string to token number
        rewardsNum = Number(BigInt(rewardsStr) / BigInt(1e18));
      } catch (e) {
        rewardsNum = 0;
      }
      
      // Composite score
      const rewardsScore = Math.log10(rewardsNum + 1) * 10;
      const tasksScore = Math.log10((m.stats?.completedTasks || 0) + 1) * 25;
      const repScore = (m.reputation || 50) * 0.2;
      const levelScore = (m.level || 1) * 2;
      const streakScore = Math.min(m.currentStreak || 0, 100) * 0.1;
      const composite = rewardsScore + tasksScore + repScore + levelScore + streakScore;
      
      // Efficiency: tokens per task
      const efficiency = (m.stats?.completedTasks || 0) > 0 
        ? rewardsNum / m.stats.completedTasks 
        : 0;
      
      return {
        address: m.address,
        name: m.name || m.address?.slice(0, 8) || 'Unknown',
        status: m.status || 'offline',
        level: m.level || 1,
        xp: m.xp || 0,
        reputation: m.reputation || 50,
        stakingTier: m.stakingTier || 'none',
        currentStreak: m.currentStreak || 0,
        tier: m.tier || 'bronze',
        stats: {
          completedTasks: m.stats?.completedTasks || 0,
          successRate: (m.stats?.completedTasks || 0) > 0 
            ? (((m.stats?.successfulTasks || 0) / m.stats.completedTasks) * 100).toFixed(1)
            : '100',
          totalRewards: rewardsStr,
          avgResponseTime: m.stats?.avgResponseTime || 0,
          avgScore: m.stats?.avgScore || 0,
          jackpotsWon: m.stats?.jackpotsWon || 0
        },
        scores: {
          composite: composite.toFixed(2),
          efficiency: efficiency.toFixed(4),
          rewards: rewardsScore.toFixed(2),
          tasks: tasksScore.toFixed(2)
        },
        multipliers: m.multipliers || {},
        totalMultiplier: (
          (m.multipliers?.staking || 1) * 
          (m.multipliers?.streak || 1) * 
          (m.multipliers?.level || 1) * 
          (m.multipliers?.achievement || 1)
        ).toFixed(2)
      };
    });
    
    // Sort
    const sortFns = {
      composite: (a, b) => parseFloat(b.scores.composite) - parseFloat(a.scores.composite),
      rewards: (a, b) => {
        try {
          return BigInt(b.stats.totalRewards) > BigInt(a.stats.totalRewards) ? 1 : -1;
        } catch { return 0; }
      },
      tasks: (a, b) => b.stats.completedTasks - a.stats.completedTasks,
      efficiency: (a, b) => parseFloat(b.scores.efficiency) - parseFloat(a.scores.efficiency),
      level: (a, b) => b.level - a.level || b.xp - a.xp,
      streak: (a, b) => b.currentStreak - a.currentStreak,
      reputation: (a, b) => b.reputation - a.reputation
    };
    
    scored.sort(sortFns[sortBy] || sortFns.composite);
    
    return scored.slice(0, limit).map((m, i) => ({ rank: i + 1, ...m }));
  }
}

module.exports = RewardEngine;
