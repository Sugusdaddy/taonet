const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['miner_joined', 'task_completed', 'reward_earned', 'jackpot_won', 'level_up', 'achievement', 'tournament_join', 'tier_upgrade'],
    required: true
  },
  miner: {
    address: String,
    name: String
  },
  data: {
    amount: Number,
    taskId: String,
    jackpotType: String,
    level: Number,
    achievement: String,
    tier: String,
    tournamentName: String
  },
  createdAt: { type: Date, default: Date.now }
});

// Auto-delete after 24 hours
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Activity', activitySchema);
