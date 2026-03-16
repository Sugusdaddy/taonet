const Miner = require('./models/Miner');
const Penalty = require('./models/Penalty');
const { createNotification, NotificationTemplates } = require('./routes/notifications');

// Penalty configuration
const PenaltyConfig = {
  task_timeout: {
    severity: 'minor',
    reputationLoss: 2,
    cooldownMinutes: 5,
    expiresHours: 24
  },
  task_failed: {
    severity: 'moderate',
    reputationLoss: 5,
    cooldownMinutes: 10,
    expiresHours: 48
  },
  low_quality: {
    severity: 'moderate',
    reputationLoss: 10,
    cooldownMinutes: 30,
    expiresHours: 72
  },
  spam: {
    severity: 'severe',
    reputationLoss: 25,
    cooldownMinutes: 60,
    expiresHours: 168 // 1 week
  },
  invalid_response: {
    severity: 'minor',
    reputationLoss: 3,
    cooldownMinutes: 5,
    expiresHours: 24
  },
  offline_penalty: {
    severity: 'minor',
    reputationLoss: 1,
    cooldownMinutes: 0,
    expiresHours: 12
  },
  abuse: {
    severity: 'critical',
    reputationLoss: 50,
    cooldownMinutes: 1440, // 24 hours
    expiresHours: 720 // 30 days
  }
};

// Issue a penalty to a miner
async function issuePenalty(minerAddress, type, taskId = null, reason = '') {
  try {
    const config = PenaltyConfig[type];
    if (!config) {
      console.error(`Unknown penalty type: ${type}`);
      return null;
    }
    
    const miner = await Miner.findOne({ address: minerAddress.toLowerCase() });
    if (!miner) {
      console.error(`Miner not found: ${minerAddress}`);
      return null;
    }
    
    // Check if miner is in cooldown for this penalty type
    const recentPenalty = await Penalty.findOne({
      miner: minerAddress.toLowerCase(),
      type,
      status: 'active',
      createdAt: { $gte: new Date(Date.now() - config.cooldownMinutes * 60 * 1000) }
    });
    
    if (recentPenalty && config.cooldownMinutes > 0) {
      // Already penalized recently, skip
      return null;
    }
    
    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.expiresHours);
    
    // Create penalty
    const penalty = new Penalty({
      miner: minerAddress.toLowerCase(),
      type,
      severity: config.severity,
      reputationLoss: config.reputationLoss,
      task: taskId,
      reason,
      expiresAt
    });
    await penalty.save();
    
    // Apply reputation loss
    miner.reputation = Math.max(0, miner.reputation - config.reputationLoss);
    
    // Track penalty stats
    if (!miner.stats.penalties) miner.stats.penalties = {};
    miner.stats.penalties[type] = (miner.stats.penalties[type] || 0) + 1;
    miner.stats.totalPenalties = (miner.stats.totalPenalties || 0) + 1;
    
    await miner.save();
    
    // Send notification
    await createNotification(
      minerAddress,
      'system',
      'Penalty Received',
      `You received a ${config.severity} penalty: ${type}. Reputation -${config.reputationLoss}.`,
      { penaltyId: penalty._id, type, reputationLoss: config.reputationLoss },
      config.severity === 'critical' ? 'urgent' : 'normal'
    );
    
    console.log(`Penalty issued: ${type} to ${minerAddress}, -${config.reputationLoss} rep`);
    
    return penalty;
  } catch (error) {
    console.error('Issue penalty error:', error);
    return null;
  }
}

// Check if miner is suspended (too many penalties)
async function checkSuspension(minerAddress) {
  const activePenalties = await Penalty.countDocuments({
    miner: minerAddress.toLowerCase(),
    status: 'active'
  });
  
  const criticalPenalties = await Penalty.countDocuments({
    miner: minerAddress.toLowerCase(),
    status: 'active',
    severity: 'critical'
  });
  
  // Suspend if:
  // - More than 10 active penalties
  // - Any critical penalty
  // - Reputation below 10
  const miner = await Miner.findOne({ address: minerAddress.toLowerCase() });
  
  return {
    suspended: activePenalties >= 10 || criticalPenalties > 0 || (miner?.reputation || 0) < 10,
    reason: criticalPenalties > 0 
      ? 'Critical penalty active' 
      : activePenalties >= 10 
        ? 'Too many penalties' 
        : miner?.reputation < 10 
          ? 'Reputation too low'
          : null,
    activePenalties,
    criticalPenalties,
    reputation: miner?.reputation || 0
  };
}

// Get miner penalty history
async function getPenaltyHistory(minerAddress, limit = 50) {
  return await Penalty.find({ miner: minerAddress.toLowerCase() })
    .sort({ createdAt: -1 })
    .limit(limit);
}

// Reputation recovery (for good behavior)
async function recoverReputation(minerAddress, amount) {
  const miner = await Miner.findOne({ address: minerAddress.toLowerCase() });
  if (!miner) return null;
  
  const oldRep = miner.reputation;
  miner.reputation = Math.min(100, miner.reputation + amount);
  await miner.save();
  
  return {
    oldReputation: oldRep,
    newReputation: miner.reputation,
    recovered: miner.reputation - oldRep
  };
}

// Quality-based reputation adjustment
async function adjustReputationForQuality(minerAddress, qualityScore) {
  const miner = await Miner.findOne({ address: minerAddress.toLowerCase() });
  if (!miner) return null;
  
  let adjustment = 0;
  
  if (qualityScore >= 95) {
    adjustment = 1; // Excellent quality
  } else if (qualityScore >= 85) {
    adjustment = 0.5; // Good quality
  } else if (qualityScore >= 70) {
    adjustment = 0; // Acceptable
  } else if (qualityScore >= 50) {
    adjustment = -0.5; // Below average
  } else {
    adjustment = -1; // Poor quality
    
    // Issue penalty for very low quality
    if (qualityScore < 30) {
      await issuePenalty(minerAddress, 'low_quality', null, `Quality score: ${qualityScore}`);
    }
  }
  
  if (adjustment !== 0) {
    miner.reputation = Math.max(0, Math.min(100, miner.reputation + adjustment));
    await miner.save();
  }
  
  return { adjustment, newReputation: miner.reputation };
}

module.exports = {
  PenaltyConfig,
  issuePenalty,
  checkSuspension,
  getPenaltyHistory,
  recoverReputation,
  adjustReputationForQuality
};
