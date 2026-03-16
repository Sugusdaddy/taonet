const mongoose = require('mongoose');

const TournamentSchema = new mongoose.Schema({
  // Tournament info
  name: { type: String, required: true },
  description: String,
  type: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly', 'special'], 
    default: 'weekly' 
  },
  
  // Time window
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  
  // Prize pool
  prizePool: { type: String, required: true },
  prizes: [{
    rank: Number,
    amount: String,
    percentage: Number
  }],
  
  // Leaderboard
  leaderboard: [{
    miner: { type: String, required: true },
    score: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    avgQuality: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }],
  
  // Scoring criteria
  scoring: {
    taskCompletion: { type: Number, default: 10 },   // Points per task
    qualityBonus: { type: Number, default: 1 },      // Points per quality point
    speedBonus: { type: Number, default: 5 },        // Bonus for fast responses
    streakBonus: { type: Number, default: 2 }        // Multiplier for streak
  },
  
  // Winners (set after tournament ends)
  winners: [{
    rank: Number,
    miner: String,
    score: Number,
    prize: String
  }],
  
  // Status
  status: { 
    type: String, 
    enum: ['upcoming', 'active', 'completed', 'cancelled'], 
    default: 'upcoming' 
  },
  
  // Requirements to participate
  requirements: {
    minLevel: { type: Number, default: 1 },
    minStakingTier: { type: String, default: 'bronze' },
    minReputation: { type: Number, default: 0 }
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now }
});

TournamentSchema.index({ status: 1, startTime: 1 });
TournamentSchema.index({ 'leaderboard.miner': 1 });

module.exports = mongoose.model('Tournament', TournamentSchema);
