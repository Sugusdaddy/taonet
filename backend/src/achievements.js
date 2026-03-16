// Achievement definitions
const ACHIEVEMENTS = {
  // Onboarding
  'first_task': {
    id: 'first_task',
    name: 'First Steps',
    description: 'Complete your first task',
    icon: '🎯',
    xpReward: 50,
    category: 'onboarding'
  },
  'verified_miner': {
    id: 'verified_miner',
    name: 'Verified Miner',
    description: 'Verify your wallet and become a registered miner',
    icon: '✅',
    xpReward: 100,
    category: 'onboarding'
  },
  
  // Task milestones
  'task_10': {
    id: 'task_10',
    name: 'Getting Started',
    description: 'Complete 10 tasks',
    icon: '⚡',
    xpReward: 100,
    category: 'tasks'
  },
  'task_100': {
    id: 'task_100',
    name: 'Task Master',
    description: 'Complete 100 tasks',
    icon: '🔥',
    xpReward: 500,
    category: 'tasks'
  },
  'task_1000': {
    id: 'task_1000',
    name: 'Task Legend',
    description: 'Complete 1,000 tasks',
    icon: '👑',
    xpReward: 2500,
    category: 'tasks'
  },
  'task_10000': {
    id: 'task_10000',
    name: 'Task God',
    description: 'Complete 10,000 tasks',
    icon: '🌟',
    xpReward: 10000,
    category: 'tasks'
  },
  
  // Streak achievements
  'streak_7': {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day mining streak',
    icon: '📅',
    xpReward: 200,
    category: 'streaks'
  },
  'streak_30': {
    id: 'streak_30',
    name: 'Month Master',
    description: 'Maintain a 30-day mining streak',
    icon: '🗓️',
    xpReward: 1000,
    category: 'streaks'
  },
  'streak_100': {
    id: 'streak_100',
    name: 'Unstoppable',
    description: 'Maintain a 100-day mining streak',
    icon: '💎',
    xpReward: 5000,
    category: 'streaks'
  },
  
  // Quality achievements
  'perfect_10': {
    id: 'perfect_10',
    name: 'Perfectionist',
    description: 'Get 10 perfect scores (100) on tasks',
    icon: '💯',
    xpReward: 300,
    category: 'quality'
  },
  'reputation_90': {
    id: 'reputation_90',
    name: 'Trusted Node',
    description: 'Reach 90+ reputation score',
    icon: '🏆',
    xpReward: 500,
    category: 'quality'
  },
  
  // Speed achievements
  'speed_demon': {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a task in under 1 second',
    icon: '⚡',
    xpReward: 150,
    category: 'speed'
  },
  'lightning_100': {
    id: 'lightning_100',
    name: 'Lightning Fast',
    description: 'Complete 100 tasks in under 2 seconds each',
    icon: '🌩️',
    xpReward: 750,
    category: 'speed'
  },
  
  // Jackpot achievements
  'first_jackpot': {
    id: 'first_jackpot',
    name: 'Lucky Strike',
    description: 'Win your first jackpot',
    icon: '🎰',
    xpReward: 500,
    category: 'jackpot'
  },
  'jackpot_5': {
    id: 'jackpot_5',
    name: 'Fortune Favors',
    description: 'Win 5 jackpots',
    icon: '💰',
    xpReward: 2000,
    category: 'jackpot'
  },
  'mega_jackpot': {
    id: 'mega_jackpot',
    name: 'Mega Winner',
    description: 'Win a mega jackpot (1000x+)',
    icon: '🎇',
    xpReward: 5000,
    category: 'jackpot'
  },
  
  // Referral achievements
  'referral_1': {
    id: 'referral_1',
    name: 'Networker',
    description: 'Refer your first miner',
    icon: '🤝',
    xpReward: 200,
    category: 'referral'
  },
  'referral_10': {
    id: 'referral_10',
    name: 'Influencer',
    description: 'Refer 10 miners',
    icon: '📣',
    xpReward: 1000,
    category: 'referral'
  },
  'referral_100': {
    id: 'referral_100',
    name: 'Network King',
    description: 'Refer 100 miners',
    icon: '👑',
    xpReward: 5000,
    category: 'referral'
  },
  
  // Staking achievements
  'tier_silver': {
    id: 'tier_silver',
    name: 'Silver Holder',
    description: 'Reach Silver staking tier (10k tokens)',
    icon: '🥈',
    xpReward: 200,
    category: 'staking'
  },
  'tier_gold': {
    id: 'tier_gold',
    name: 'Gold Holder',
    description: 'Reach Gold staking tier (100k tokens)',
    icon: '🥇',
    xpReward: 500,
    category: 'staking'
  },
  'tier_platinum': {
    id: 'tier_platinum',
    name: 'Platinum Holder',
    description: 'Reach Platinum staking tier (1M tokens)',
    icon: '💎',
    xpReward: 1500,
    category: 'staking'
  },
  'tier_diamond': {
    id: 'tier_diamond',
    name: 'Diamond Hands',
    description: 'Reach Diamond staking tier (10M tokens)',
    icon: '💠',
    xpReward: 5000,
    category: 'staking'
  },
  
  // Special achievements
  'early_adopter': {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Join TaoNet in the first week',
    icon: '🌅',
    xpReward: 500,
    category: 'special'
  },
  'night_owl': {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Complete a task between 2-5 AM UTC',
    icon: '🦉',
    xpReward: 100,
    category: 'special'
  },
  'weekend_warrior': {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Complete 50 tasks on a weekend',
    icon: '🎉',
    xpReward: 300,
    category: 'special'
  },
  
  // Level achievements
  'level_10': {
    id: 'level_10',
    name: 'Rising Star',
    description: 'Reach Level 10',
    icon: '⭐',
    xpReward: 500,
    category: 'level'
  },
  'level_25': {
    id: 'level_25',
    name: 'Veteran Miner',
    description: 'Reach Level 25',
    icon: '🌟',
    xpReward: 1500,
    category: 'level'
  },
  'level_50': {
    id: 'level_50',
    name: 'Elite Miner',
    description: 'Reach Level 50',
    icon: '✨',
    xpReward: 5000,
    category: 'level'
  },
  'level_100': {
    id: 'level_100',
    name: 'Legendary',
    description: 'Reach Level 100',
    icon: '🏅',
    xpReward: 20000,
    category: 'level'
  }
};

// Check and unlock achievements for a miner
async function checkAchievements(miner) {
  const newAchievements = [];
  const hasAchievement = (id) => miner.achievements.some(a => a.id === id);
  
  // Task milestones
  if (miner.stats.completedTasks >= 1 && !hasAchievement('first_task')) {
    newAchievements.push('first_task');
  }
  if (miner.stats.completedTasks >= 10 && !hasAchievement('task_10')) {
    newAchievements.push('task_10');
  }
  if (miner.stats.completedTasks >= 100 && !hasAchievement('task_100')) {
    newAchievements.push('task_100');
  }
  if (miner.stats.completedTasks >= 1000 && !hasAchievement('task_1000')) {
    newAchievements.push('task_1000');
  }
  if (miner.stats.completedTasks >= 10000 && !hasAchievement('task_10000')) {
    newAchievements.push('task_10000');
  }
  
  // Streak achievements
  if (miner.longestStreak >= 7 && !hasAchievement('streak_7')) {
    newAchievements.push('streak_7');
  }
  if (miner.longestStreak >= 30 && !hasAchievement('streak_30')) {
    newAchievements.push('streak_30');
  }
  if (miner.longestStreak >= 100 && !hasAchievement('streak_100')) {
    newAchievements.push('streak_100');
  }
  
  // Quality achievements
  if (miner.reputation >= 90 && !hasAchievement('reputation_90')) {
    newAchievements.push('reputation_90');
  }
  
  // Jackpot achievements
  if (miner.stats.jackpotsWon >= 1 && !hasAchievement('first_jackpot')) {
    newAchievements.push('first_jackpot');
  }
  if (miner.stats.jackpotsWon >= 5 && !hasAchievement('jackpot_5')) {
    newAchievements.push('jackpot_5');
  }
  
  // Referral achievements
  if (miner.referralCount >= 1 && !hasAchievement('referral_1')) {
    newAchievements.push('referral_1');
  }
  if (miner.referralCount >= 10 && !hasAchievement('referral_10')) {
    newAchievements.push('referral_10');
  }
  if (miner.referralCount >= 100 && !hasAchievement('referral_100')) {
    newAchievements.push('referral_100');
  }
  
  // Staking tier achievements
  if (miner.stakingTier === 'silver' && !hasAchievement('tier_silver')) {
    newAchievements.push('tier_silver');
  }
  if (miner.stakingTier === 'gold' && !hasAchievement('tier_gold')) {
    newAchievements.push('tier_gold');
  }
  if (miner.stakingTier === 'platinum' && !hasAchievement('tier_platinum')) {
    newAchievements.push('tier_platinum');
  }
  if (miner.stakingTier === 'diamond' && !hasAchievement('tier_diamond')) {
    newAchievements.push('tier_diamond');
  }
  
  // Level achievements
  if (miner.level >= 10 && !hasAchievement('level_10')) {
    newAchievements.push('level_10');
  }
  if (miner.level >= 25 && !hasAchievement('level_25')) {
    newAchievements.push('level_25');
  }
  if (miner.level >= 50 && !hasAchievement('level_50')) {
    newAchievements.push('level_50');
  }
  if (miner.level >= 100 && !hasAchievement('level_100')) {
    newAchievements.push('level_100');
  }
  
  // Time-based achievements
  const hour = new Date().getUTCHours();
  if (hour >= 2 && hour < 5 && !hasAchievement('night_owl')) {
    newAchievements.push('night_owl');
  }
  
  // Unlock new achievements
  let totalXpEarned = 0;
  for (const achievementId of newAchievements) {
    const achievement = ACHIEVEMENTS[achievementId];
    miner.achievements.push({
      id: achievementId,
      unlockedAt: new Date(),
      claimed: false
    });
    totalXpEarned += achievement.xpReward;
  }
  
  if (newAchievements.length > 0) {
    await miner.addXp(totalXpEarned);
    
    // Update achievement multiplier (1% per achievement)
    miner.multipliers.achievement = 1 + miner.achievements.length * 0.01;
    await miner.save();
  }
  
  return newAchievements.map(id => ACHIEVEMENTS[id]);
}

// Get all achievements with unlock status for a miner
function getAchievementsForMiner(miner) {
  const minerAchievementIds = miner.achievements.map(a => a.id);
  const minerAchievementMap = {};
  miner.achievements.forEach(a => {
    minerAchievementMap[a.id] = a;
  });
  
  return Object.values(ACHIEVEMENTS).map(achievement => ({
    ...achievement,
    unlocked: minerAchievementIds.includes(achievement.id),
    unlockedAt: minerAchievementMap[achievement.id]?.unlockedAt || null,
    claimed: minerAchievementMap[achievement.id]?.claimed || false
  }));
}

module.exports = { 
  ACHIEVEMENTS, 
  checkAchievements, 
  getAchievementsForMiner 
};
