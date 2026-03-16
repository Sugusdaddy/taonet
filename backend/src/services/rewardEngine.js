/**
 * TaoNet Reward Engine
 * Dynamic reward calculation with multiple factors
 */

const Miner = require('../models/Miner');
const Reward = require('../models/Reward');

// Base reward per task (in wei - 1 token = 1e18 wei)
const BASE_REWARD = BigInt('1000000000000000000'); // 1 token

// Reward factors
const FACTORS = {
  // Speed bonuses (response time in ms)
  speed: {
    instant: { maxMs: 500, bonus: 0.5 },      // +50%
    fast: { maxMs: 2000, bonus: 0.3 },        // +30%
    normal: { maxMs: 5000, bonus: 0.1 },      // +10%
    slow: { maxMs: 10000, bonus: 0 }          // No bonus
  },
  
  // Quality score bonuses (0-100)
  quality: {
    excellent: { minScore: 90, bonus: 0.4 },  // +40%
    good: { minScore: 75, bonus: 0.2 },       // +20%
    average: { minScore: 50, bonus: 0 },      // No bonus
    poor: { minScore: 0, bonus: -0.2 }        // -20%
  },
  
  // Streak bonuses
  streak: {
    7: 0.1,    // 7 days = +10%
    14: 0.2,   // 14 days = +20%
    30: 0.35,  // 30 days = +35%
    60: 0.5,   // 60 days = +50%
    100: 0.75  // 100 days = +75%
  },
  
  // Level bonuses (per level)
  levelBonus: 0.02, // +2% per level
  
  // Reputation bonuses
  reputation: {
    excellent: { minRep: 90, bonus: 0.3 },
    good: { minRep: 70, bonus: 0.15 },
    neutral: { minRep: 50, bonus: 0 },
    poor: { minRep: 0, bonus: -0.25 }
  },
  
  // Task type multipliers
  taskType: {
    text: 1.0,
    code: 1.5,      // Code is harder
    image: 1.3,     // Image generation
    trading: 2.0,   // Trading signals high value
    custom: 1.2
  },
  
  // Time of day bonus (UTC hours)
  peakHours: {
    ranges: [[14, 22]], // 2PM-10PM UTC = peak
    bonus: 0.1
  },
  
  // Scarcity bonus (fewer miners = higher rewards)
  scarcity: {
    veryLow: { maxMiners: 5, bonus: 0.5 },
    low: { maxMiners: 20, bonus: 0.25 },
    normal: { maxMiners: 50, bonus: 0.1 },
    high: { maxMiners: 100, bonus: 0 }
  }
};

class RewardEngine {
  /**
   * Calculate reward for a completed task
   */
  static async calculateReward(task, miner, response) {
    const breakdown = {
      base: BASE_REWARD.toString(),
      factors: {},
      multipliers: {},
      bonuses: {},
      penalties: {},
      final: '0'
    };
    
    let totalMultiplier = 1.0;
    
    // 1. Speed factor
    const responseTime = response.responseTime || 5000;
    const speedFactor = this.getSpeedFactor(responseTime);
    breakdown.factors.speed = { 
      responseTimeMs: responseTime, 
      bonus: speedFactor 
    };
    totalMultiplier += speedFactor;
    
    // 2. Quality factor
    const score = response.score || 50;
    const qualityFactor = this.getQualityFactor(score);
    breakdown.factors.quality = { 
      score, 
      bonus: qualityFactor 
    };
    totalMultiplier += qualityFactor;
    
    // 3. Streak bonus
    const streakBonus = this.getStreakBonus(miner.currentStreak);
    breakdown.bonuses.streak = { 
      days: miner.currentStreak, 
      bonus: streakBonus 
    };
    totalMultiplier += streakBonus;
    
    // 4. Level bonus
    const levelBonus = (miner.level - 1) * FACTORS.levelBonus;
    breakdown.bonuses.level = { 
      level: miner.level, 
      bonus: levelBonus 
    };
    totalMultiplier += levelBonus;
    
    // 5. Reputation factor
    const repFactor = this.getReputationFactor(miner.reputation);
    breakdown.factors.reputation = { 
      reputation: miner.reputation, 
      bonus: repFactor 
    };
    totalMultiplier += repFactor;
    
    // 6. Staking multiplier (from miner)
    const stakingMult = miner.multipliers?.staking || 1.0;
    breakdown.multipliers.staking = { 
      tier: miner.stakingTier, 
      multiplier: stakingMult 
    };
    
    // 7. Task type multiplier
    const taskTypeMult = FACTORS.taskType[task.type] || 1.0;
    breakdown.multipliers.taskType = { 
      type: task.type, 
      multiplier: taskTypeMult 
    };
    
    // 8. Peak hours bonus
    const hour = new Date().getUTCHours();
    const isPeakHour = FACTORS.peakHours.ranges.some(
      ([start, end]) => hour >= start && hour < end
    );
    const peakBonus = isPeakHour ? FACTORS.peakHours.bonus : 0;
    breakdown.bonuses.peakHours = { 
      hour, 
      isPeak: isPeakHour, 
      bonus: peakBonus 
    };
    totalMultiplier += peakBonus;
    
    // 9. Scarcity bonus (active miners)
    const activeCount = global.activeMiners?.size || 10;
    const scarcityBonus = this.getScarcityBonus(activeCount);
    breakdown.bonuses.scarcity = { 
      activeMiners: activeCount, 
      bonus: scarcityBonus 
    };
    totalMultiplier += scarcityBonus;
    
    // 10. Achievement multiplier
    const achievementMult = miner.multipliers?.achievement || 1.0;
    breakdown.multipliers.achievement = achievementMult;
    
    // Calculate final reward
    // Formula: BASE * totalMultiplier * stakingMult * taskTypeMult * achievementMult
    const finalMultiplier = totalMultiplier * stakingMult * taskTypeMult * achievementMult;
    const finalReward = BigInt(Math.floor(Number(BASE_REWARD) * finalMultiplier));
    
    breakdown.totalMultiplier = finalMultiplier.toFixed(4);
    breakdown.final = finalReward.toString();
    
    return {
      reward: finalReward.toString(),
      breakdown
    };
  }
  
  static getSpeedFactor(responseTimeMs) {
    for (const [key, { maxMs, bonus }] of Object.entries(FACTORS.speed)) {
      if (responseTimeMs <= maxMs) return bonus;
    }
    return 0;
  }
  
  static getQualityFactor(score) {
    for (const [key, { minScore, bonus }] of Object.entries(FACTORS.quality)) {
      if (score >= minScore) return bonus;
    }
    return -0.2;
  }
  
  static getStreakBonus(streakDays) {
    let bonus = 0;
    for (const [days, streakBonus] of Object.entries(FACTORS.streak)) {
      if (streakDays >= parseInt(days)) bonus = streakBonus;
    }
    return bonus;
  }
  
  static getReputationFactor(reputation) {
    for (const [key, { minRep, bonus }] of Object.entries(FACTORS.reputation)) {
      if (reputation >= minRep) return bonus;
    }
    return -0.25;
  }
  
  static getScarcityBonus(activeMiners) {
    for (const [key, { maxMiners, bonus }] of Object.entries(FACTORS.scarcity)) {
      if (activeMiners <= maxMiners) return bonus;
    }
    return 0;
  }
  
  /**
   * Calculate XP for a task
   */
  static calculateXP(task, response) {
    let xp = 10; // Base XP
    
    // Speed bonus
    const rt = response.responseTime || 5000;
    if (rt < 500) xp += 15;
    else if (rt < 2000) xp += 10;
    else if (rt < 5000) xp += 5;
    
    // Quality bonus
    const score = response.score || 50;
    if (score >= 90) xp += 20;
    else if (score >= 75) xp += 10;
    else if (score >= 50) xp += 5;
    
    // Task type bonus
    const typeBonus = {
      text: 0,
      code: 10,
      image: 5,
      trading: 15,
      custom: 5
    };
    xp += typeBonus[task.type] || 0;
    
    return xp;
  }
  
  /**
   * Update miner reputation based on task result
   */
  static updateReputation(miner, score, wasSuccessful) {
    let delta = 0;
    
    if (wasSuccessful) {
      if (score >= 90) delta = 2;
      else if (score >= 75) delta = 1;
      else if (score >= 50) delta = 0.5;
      else delta = -0.5;
    } else {
      delta = -2; // Failed task
    }
    
    // Apply change with bounds
    miner.reputation = Math.max(0, Math.min(100, miner.reputation + delta));
    return miner.reputation;
  }
  
  /**
   * Get leaderboard with composite scoring
   */
  static async getLeaderboard(options = {}) {
    const {
      sortBy = 'composite',
      limit = 50,
      timeframe = 'all' // 'day', 'week', 'month', 'all'
    } = options;
    
    // Get timeframe filter
    let dateFilter = {};
    if (timeframe !== 'all') {
      const now = new Date();
      const ranges = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000
      };
      dateFilter = { updatedAt: { $gte: new Date(now - ranges[timeframe]) } };
    }
    
    const miners = await Miner.find({
      'stats.completedTasks': { $gt: 0 }, status: { $exists: true },
      ...dateFilter
    }).lean();
    
    // Calculate composite scores
    const scored = miners.map(m => {
      // Composite score formula:
      // 40% rewards + 25% tasks + 20% reputation + 10% level + 5% streak
      const rewardsScore = Math.log10(Number(BigInt(m.stats.totalRewards || '0') / BigInt(1e18)) + 1) * 10;
      const tasksScore = Math.log10(m.stats.completedTasks + 1) * 25;
      const repScore = m.reputation * 0.2;
      const levelScore = m.level * 2;
      const streakScore = Math.min(m.currentStreak, 100) * 0.1;
      
      const composite = rewardsScore + tasksScore + repScore + levelScore + streakScore;
      
      // Efficiency: rewards per task
      const efficiency = m.stats.completedTasks > 0 
        ? Number(BigInt(m.stats.totalRewards || '0') / BigInt(1e18)) / m.stats.completedTasks
        : 0;
      
      return {
        address: m.address,
        name: m.name || m.address.slice(0, 8),
        status: m.status || 'offline',
        level: m.level,
        xp: m.xp,
        reputation: m.reputation,
        stakingTier: m.stakingTier,
        currentStreak: m.currentStreak,
        stats: {
          completedTasks: m.stats.completedTasks,
          successRate: m.stats.completedTasks > 0 
            ? ((m.stats.successfulTasks / m.stats.completedTasks) * 100).toFixed(1)
            : 0,
          totalRewards: m.stats.totalRewards,
          avgResponseTime: m.stats.avgResponseTime,
          avgScore: m.stats.avgScore,
          jackpotsWon: m.stats.jackpotsWon
        },
        scores: {
          composite: composite.toFixed(2),
          efficiency: efficiency.toFixed(4),
          rewards: rewardsScore.toFixed(2),
          tasks: tasksScore.toFixed(2)
        },
        multipliers: m.multipliers,
        totalMultiplier: (
          (m.multipliers?.staking || 1) * 
          (m.multipliers?.streak || 1) * 
          (m.multipliers?.level || 1) * 
          (m.multipliers?.achievement || 1)
        ).toFixed(2)
      };
    });
    
    // Sort by selected metric
    const sortFunctions = {
      composite: (a, b) => parseFloat(b.scores.composite) - parseFloat(a.scores.composite),
      rewards: (a, b) => BigInt(b.stats.totalRewards) > BigInt(a.stats.totalRewards) ? 1 : -1,
      tasks: (a, b) => b.stats.completedTasks - a.stats.completedTasks,
      efficiency: (a, b) => parseFloat(b.scores.efficiency) - parseFloat(a.scores.efficiency),
      level: (a, b) => b.level - a.level || b.xp - a.xp,
      streak: (a, b) => b.currentStreak - a.currentStreak,
      reputation: (a, b) => b.reputation - a.reputation
    };
    
    scored.sort(sortFunctions[sortBy] || sortFunctions.composite);
    
    // Add ranks
    return scored.slice(0, limit).map((m, i) => ({
      rank: i + 1,
      ...m
    }));
  }
}

module.exports = RewardEngine;
