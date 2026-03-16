const Miner = require('./models/Miner');
const Task = require('./models/Task');

// Difficulty configuration
const DifficultyConfig = {
  // Task timeout based on difficulty
  timeouts: {
    easy: 60000,      // 60 seconds
    medium: 120000,   // 2 minutes
    hard: 300000,     // 5 minutes
    expert: 600000    // 10 minutes
  },
  
  // Reward multipliers
  rewardMultipliers: {
    easy: 1.0,
    medium: 1.5,
    hard: 2.5,
    expert: 5.0
  },
  
  // XP multipliers
  xpMultipliers: {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
    expert: 3.0
  },
  
  // Minimum reputation required
  minReputation: {
    easy: 0,
    medium: 30,
    hard: 50,
    expert: 70
  },
  
  // Minimum level required
  minLevel: {
    easy: 1,
    medium: 3,
    hard: 7,
    expert: 15
  }
};

// Calculate task difficulty based on content
function calculateTaskDifficulty(task) {
  let score = 0;
  
  // Type-based base difficulty
  const typeScores = {
    text: 10,
    code: 30,
    image: 40,
    trading: 50
  };
  score += typeScores[task.type] || 20;
  
  // Prompt length factor
  const promptLength = (task.prompt || '').length;
  if (promptLength > 5000) score += 30;
  else if (promptLength > 2000) score += 20;
  else if (promptLength > 500) score += 10;
  
  // Complexity indicators in prompt
  const complexityKeywords = [
    'complex', 'advanced', 'expert', 'professional',
    'detailed', 'comprehensive', 'in-depth', 'thorough',
    'optimize', 'refactor', 'architecture', 'system design',
    'multi-step', 'analyze', 'compare', 'evaluate'
  ];
  
  const promptLower = (task.prompt || '').toLowerCase();
  complexityKeywords.forEach(keyword => {
    if (promptLower.includes(keyword)) score += 5;
  });
  
  // Parameters factor
  if (task.parameters) {
    if (task.parameters.maxTokens > 2000) score += 15;
    if (task.parameters.temperature > 0.8) score += 5;
  }
  
  // Determine difficulty level
  if (score >= 80) return 'expert';
  if (score >= 50) return 'hard';
  if (score >= 25) return 'medium';
  return 'easy';
}

// Check if miner is eligible for difficulty
function checkDifficultyEligibility(miner, difficulty) {
  const minRep = DifficultyConfig.minReputation[difficulty];
  const minLvl = DifficultyConfig.minLevel[difficulty];
  
  if (miner.reputation < minRep) {
    return {
      eligible: false,
      reason: `Requires ${minRep} reputation (you have ${miner.reputation})`
    };
  }
  
  if (miner.level < minLvl) {
    return {
      eligible: false,
      reason: `Requires level ${minLvl} (you are level ${miner.level})`
    };
  }
  
  return { eligible: true };
}

// Auto-scaling based on network load
async function calculateNetworkDifficulty() {
  try {
    // Get current network state
    const onlineMiners = global.activeMiners?.size || 1;
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const recentCompletedTasks = await Task.countDocuments({
      status: 'completed',
      completedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });
    
    // Calculate load factor
    const loadFactor = pendingTasks / Math.max(1, onlineMiners);
    const throughput = recentCompletedTasks / 60; // Tasks per minute
    
    // Scaling decision
    let scaling = {
      factor: 1.0,
      reason: 'normal',
      rewardBoost: 0,
      recommendations: []
    };
    
    if (loadFactor > 5) {
      // High load - need more miners
      scaling = {
        factor: 0.8, // Reduce difficulty to get more completions
        reason: 'high_load',
        rewardBoost: 20, // Boost rewards to attract miners
        recommendations: ['Recruit more miners', 'Increase rewards']
      };
    } else if (loadFactor > 2) {
      // Moderate load
      scaling = {
        factor: 0.9,
        reason: 'moderate_load',
        rewardBoost: 10,
        recommendations: []
      };
    } else if (loadFactor < 0.5 && onlineMiners > 10) {
      // Low load - plenty of capacity
      scaling = {
        factor: 1.2, // Increase difficulty
        reason: 'low_load',
        rewardBoost: -5,
        recommendations: []
      };
    }
    
    return {
      onlineMiners,
      pendingTasks,
      throughputPerMinute: throughput.toFixed(2),
      loadFactor: loadFactor.toFixed(2),
      scaling
    };
  } catch (error) {
    console.error('Calculate network difficulty error:', error);
    return { scaling: { factor: 1.0, reason: 'error' } };
  }
}

// Get adjusted timeout for task
function getAdjustedTimeout(baseDifficulty, networkScaling = 1.0) {
  const baseTimeout = DifficultyConfig.timeouts[baseDifficulty] || 120000;
  return Math.round(baseTimeout * networkScaling);
}

// Get adjusted reward for task
function getAdjustedReward(baseDifficulty, baseReward, networkBoost = 0) {
  const multiplier = DifficultyConfig.rewardMultipliers[baseDifficulty] || 1.0;
  const boostedReward = baseReward * (1 + networkBoost / 100);
  return Math.round(boostedReward * multiplier);
}

// Miner skill matching
async function findBestMinersForTask(task, limit = 5) {
  try {
    const difficulty = calculateTaskDifficulty(task);
    const minRep = DifficultyConfig.minReputation[difficulty];
    const minLvl = DifficultyConfig.minLevel[difficulty];
    
    // Get online miners that meet requirements
    const onlineAddresses = Array.from(global.activeMiners?.keys() || []);
    
    const eligibleMiners = await Miner.find({
      address: { $in: onlineAddresses },
      capabilities: task.type,
      reputation: { $gte: minRep },
      level: { $gte: minLvl },
      isActive: true
    })
    .sort({ reputation: -1, tasksCompleted: -1 })
    .limit(limit * 2);
    
    // Score miners based on fit
    const scoredMiners = eligibleMiners.map(miner => {
      let score = 0;
      
      // Reputation score (0-100)
      score += miner.reputation;
      
      // Experience with this task type
      const typeExperience = miner.stats?.tasksByType?.[task.type] || 0;
      score += Math.min(50, typeExperience / 10);
      
      // Success rate bonus
      if (miner.tasksCompleted > 10) {
        const successRate = miner.successRate || 100;
        score += successRate / 2;
      }
      
      // Streak bonus (reliable miners)
      score += Math.min(30, miner.currentStreak);
      
      // Level bonus
      score += miner.level * 2;
      
      return { miner, score };
    });
    
    // Sort by score and return top miners
    scoredMiners.sort((a, b) => b.score - a.score);
    
    return scoredMiners.slice(0, limit).map(s => ({
      address: s.miner.address,
      name: s.miner.name,
      score: Math.round(s.score),
      reputation: s.miner.reputation,
      level: s.miner.level
    }));
  } catch (error) {
    console.error('Find best miners error:', error);
    return [];
  }
}

module.exports = {
  DifficultyConfig,
  calculateTaskDifficulty,
  checkDifficultyEligibility,
  calculateNetworkDifficulty,
  getAdjustedTimeout,
  getAdjustedReward,
  findBestMinersForTask
};
