const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Time-based aggregation
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  
  // Network metrics
  network: {
    totalMiners: { type: Number, default: 0 },
    activeMiners: { type: Number, default: 0 },
    newMiners: { type: Number, default: 0 },
    churnedMiners: { type: Number, default: 0 },
    avgOnlineTime: { type: Number, default: 0 }, // minutes
    peakOnlineMiners: { type: Number, default: 0 },
    tierDistribution: {
      bronze: { type: Number, default: 0 },
      silver: { type: Number, default: 0 },
      gold: { type: Number, default: 0 },
      platinum: { type: Number, default: 0 },
      diamond: { type: Number, default: 0 }
    }
  },
  
  // Task metrics
  tasks: {
    submitted: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    expired: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 }, // ms
    avgQualityScore: { type: Number, default: 0 },
    byType: {
      text: { submitted: Number, completed: Number, avgTime: Number },
      code: { submitted: Number, completed: Number, avgTime: Number },
      image: { submitted: Number, completed: Number, avgTime: Number },
      trading: { submitted: Number, completed: Number, avgTime: Number }
    },
    successRate: { type: Number, default: 0 } // percentage
  },
  
  // Reward metrics
  rewards: {
    totalDistributed: { type: String, default: '0' }, // BigInt as string
    avgPerTask: { type: String, default: '0' },
    byType: {
      task: { type: String, default: '0' },
      streak: { type: String, default: '0' },
      achievement: { type: String, default: '0' },
      referral: { type: String, default: '0' },
      jackpot: { type: String, default: '0' },
      tournament: { type: String, default: '0' }
    },
    topEarners: [{
      miner: String,
      amount: String
    }]
  },
  
  // Gamification metrics
  gamification: {
    achievementsUnlocked: { type: Number, default: 0 },
    jackpotsTriggered: { type: Number, default: 0 },
    jackpotPayouts: { type: String, default: '0' },
    referralsCreated: { type: Number, default: 0 },
    streaksActive: { type: Number, default: 0 },
    avgStreakLength: { type: Number, default: 0 },
    xpDistributed: { type: Number, default: 0 },
    levelUps: { type: Number, default: 0 }
  },
  
  // Performance metrics
  performance: {
    apiLatency: {
      avg: { type: Number, default: 0 },
      p50: { type: Number, default: 0 },
      p95: { type: Number, default: 0 },
      p99: { type: Number, default: 0 }
    },
    wsConnections: {
      peak: { type: Number, default: 0 },
      avg: { type: Number, default: 0 }
    },
    errors: {
      total: { type: Number, default: 0 },
      byType: { type: Map, of: Number }
    }
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
analyticsSchema.index({ period: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
