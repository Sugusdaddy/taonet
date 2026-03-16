const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Target
  miner: {
    type: String,
    required: true,
    index: true
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      'achievement_unlocked',
      'jackpot_won',
      'tournament_started',
      'tournament_ended',
      'tournament_rank',
      'level_up',
      'streak_milestone',
      'streak_broken',
      'referral_joined',
      'referral_reward',
      'reward_received',
      'task_completed',
      'reputation_change',
      'tier_upgrade',
      'daily_bonus',
      'system'
    ],
    required: true
  },
  
  // Content
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  
  // Additional data
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Status
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Priority (for sorting/filtering)
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Expiration (optional)
  expiresAt: Date
}, {
  timestamps: true
});

// Index for fetching unread notifications
notificationSchema.index({ miner: 1, read: 1, createdAt: -1 });

// Auto-expire old notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
