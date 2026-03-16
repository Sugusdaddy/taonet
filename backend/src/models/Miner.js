const mongoose = require('mongoose');

const MinerSchema = new mongoose.Schema({
  // Basic info
  address: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, default: '' },
  
  // Status
  status: { type: String, enum: ['online', 'offline', 'busy', 'banned'], default: 'offline' },
  isEligible: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
  
  // ===== GAMIFICATION =====
  
  // Level & XP System
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  xpToNextLevel: { type: Number, default: 100 },
  
  // Reputation (0-100)
  reputation: { type: Number, default: 50, min: 0, max: 100 },
  
  // Staking Tier
  stakingTier: { 
    type: String, 
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'], 
    default: 'bronze' 
  },
  tokenBalance: { type: String, default: '0' }, // Cached balance
  
  // Streaks
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: '' }, // YYYY-MM-DD
  
  // Achievements (array of achievement IDs)
  achievements: [{ 
    id: String, 
    unlockedAt: Date,
    claimed: { type: Boolean, default: false }
  }],
  
  // Referral System
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null }, // Address of referrer
  referralCount: { type: Number, default: 0 },
  referralEarnings: { type: String, default: '0' },
  
  // Stats
  stats: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    successfulTasks: { type: Number, default: 0 },
    failedTasks: { type: Number, default: 0 },
    totalXpEarned: { type: Number, default: 0 },
    totalRewards: { type: String, default: '0' },
    jackpotsWon: { type: Number, default: 0 },
    jackpotEarnings: { type: String, default: '0' },
    tournamentWins: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 }
  },
  
  // Daily bonus tracking
  dailyBonus: {
    lastClaimed: Date,
    consecutiveDays: { type: Number, default: 0 }
  },
  
  // Multipliers (from various sources)
  multipliers: {
    staking: { type: Number, default: 1.0 },
    streak: { type: Number, default: 1.0 },
    level: { type: Number, default: 1.0 },
    achievement: { type: Number, default: 1.0 },
    event: { type: Number, default: 1.0 }
  },
  
  // Hardware info (optional, for display)
  hardware: {
    gpu: String,
    cpu: String,
    ram: String,
    models: [String] // AI models they can run
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calculate total multiplier
MinerSchema.virtual('totalMultiplier').get(function() {
  const m = this.multipliers;
  return m.staking * m.streak * m.level * m.achievement * m.event;
});

// Calculate XP needed for next level (exponential curve)
MinerSchema.methods.calculateXpForLevel = function(level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

// Add XP and handle level ups
MinerSchema.methods.addXp = async function(amount) {
  this.xp += amount;
  this.stats.totalXpEarned += amount;
  
  let leveledUp = false;
  while (this.xp >= this.xpToNextLevel) {
    this.xp -= this.xpToNextLevel;
    this.level += 1;
    this.xpToNextLevel = this.calculateXpForLevel(this.level);
    this.multipliers.level = 1 + (this.level - 1) * 0.05; // 5% per level
    leveledUp = true;
  }
  
  await this.save();
  return { leveledUp, newLevel: this.level };
};

// Update streak
MinerSchema.methods.updateStreak = async function() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  if (this.lastActiveDate === today) {
    return this.currentStreak; // Already active today
  }
  
  if (this.lastActiveDate === yesterday) {
    this.currentStreak += 1;
  } else {
    this.currentStreak = 1;
  }
  
  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }
  
  // Update streak multiplier (max 2x at 30 days)
  this.multipliers.streak = Math.min(2.0, 1 + this.currentStreak * 0.033);
  
  this.lastActiveDate = today;
  await this.save();
  return this.currentStreak;
};

// Generate unique referral code
MinerSchema.methods.generateReferralCode = async function() {
  if (this.referralCode) return this.referralCode;
  
  const code = this.address.slice(2, 8).toUpperCase() + 
               Math.random().toString(36).substring(2, 6).toUpperCase();
  this.referralCode = code;
  await this.save();
  return code;
};

// Update staking tier based on balance
MinerSchema.methods.updateStakingTier = async function(balance) {
  const bal = BigInt(balance || '0');
  const tiers = [
    { name: 'diamond', min: BigInt('10000000000000000000000000'), mult: 3.0 },   // 10M tokens
    { name: 'platinum', min: BigInt('1000000000000000000000000'), mult: 2.0 },   // 1M tokens
    { name: 'gold', min: BigInt('100000000000000000000000'), mult: 1.5 },        // 100k tokens
    { name: 'silver', min: BigInt('10000000000000000000000'), mult: 1.25 },      // 10k tokens
    { name: 'bronze', min: BigInt('0'), mult: 1.0 }
  ];
  
  for (const tier of tiers) {
    if (bal >= tier.min) {
      this.stakingTier = tier.name;
      this.multipliers.staking = tier.mult;
      break;
    }
  }
  
  this.tokenBalance = balance;
  await this.save();
};

// Pre-save hook
MinerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes
MinerSchema.index({ address: 1 });
MinerSchema.index({ status: 1 });
MinerSchema.index({ level: -1 });
MinerSchema.index({ 'stats.completedTasks': -1 });
MinerSchema.index({ referralCode: 1 });
MinerSchema.index({ stakingTier: 1 });

module.exports = mongoose.model('Miner', MinerSchema);
