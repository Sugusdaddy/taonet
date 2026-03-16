const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  // Recipient
  miner: { type: String, required: true, ref: 'Miner' },
  
  // Reward type
  type: { 
    type: String, 
    enum: [
      'task',           // Regular task completion
      'jackpot',        // Jackpot win
      'achievement',    // Achievement bonus
      'referral',       // Referral commission
      'tournament',     // Tournament prize
      'daily_bonus',    // Daily login bonus
      'streak_bonus',   // Streak milestone bonus
      'level_up',       // Level up bonus
      'airdrop',        // Promotional airdrop
      'bonus'           // Generic bonus
    ],
    required: true
  },
  
  // Amount (in smallest token unit)
  amount: { type: String, required: true },
  
  // Multipliers applied
  multipliers: {
    base: { type: Number, default: 1 },
    staking: { type: Number, default: 1 },
    streak: { type: Number, default: 1 },
    level: { type: Number, default: 1 },
    event: { type: Number, default: 1 },
    total: { type: Number, default: 1 }
  },
  
  // Related entities
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  jackpot: { type: mongoose.Schema.Types.ObjectId, ref: 'Jackpot' },
  achievement: String,
  referredMiner: String,
  
  // XP earned with this reward
  xpEarned: { type: Number, default: 0 },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'distributed', 'claimed', 'failed'], 
    default: 'pending' 
  },
  
  // Distribution info
  txHash: String,
  distributedAt: Date,
  claimedAt: Date,
  
  // Notes
  notes: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now }
});

RewardSchema.index({ miner: 1, status: 1 });
RewardSchema.index({ type: 1 });
RewardSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Reward', RewardSchema);
