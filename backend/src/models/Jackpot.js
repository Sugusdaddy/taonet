const mongoose = require('mongoose');

const JackpotSchema = new mongoose.Schema({
  // Type of jackpot
  type: { 
    type: String, 
    enum: ['mini', 'regular', 'mega', 'ultra'], 
    required: true 
  },
  
  // Pool amount (in token smallest unit)
  poolAmount: { type: String, required: true },
  
  // Current entries
  entries: [{
    miner: { type: String, required: true },
    tickets: { type: Number, default: 1 },
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Winner (set when jackpot is won)
  winner: {
    address: String,
    amount: String,
    timestamp: Date,
    taskId: mongoose.Schema.Types.ObjectId
  },
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'completed'], 
    default: 'active' 
  },
  
  // Trigger condition
  triggerAt: { type: Number, required: true }, // Task count to trigger
  currentCount: { type: Number, default: 0 },
  
  // Jackpot multiplier
  multiplier: { type: Number, default: 1 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

JackpotSchema.index({ status: 1, type: 1 });

module.exports = mongoose.model('Jackpot', JackpotSchema);


// ========== JACKPOT LOGIC ==========

const JACKPOT_CONFIG = {
  mini: {
    triggerEvery: 50,        // Every 50 tasks
    basePool: '1000000000000000000',  // 1 token
    multiplierRange: [10, 50],
    chance: 0.1  // 10% of contribution goes to pool
  },
  regular: {
    triggerEvery: 500,
    basePool: '10000000000000000000',  // 10 tokens
    multiplierRange: [50, 200],
    chance: 0.05
  },
  mega: {
    triggerEvery: 5000,
    basePool: '100000000000000000000',  // 100 tokens
    multiplierRange: [200, 1000],
    chance: 0.02
  },
  ultra: {
    triggerEvery: 50000,
    basePool: '1000000000000000000000',  // 1000 tokens
    multiplierRange: [1000, 10000],
    chance: 0.01
  }
};

// Select winner from entries (weighted by tickets)
function selectWinner(entries) {
  const totalTickets = entries.reduce((sum, e) => sum + e.tickets, 0);
  let random = Math.random() * totalTickets;
  
  for (const entry of entries) {
    random -= entry.tickets;
    if (random <= 0) {
      return entry.miner;
    }
  }
  
  return entries[entries.length - 1].miner;
}

module.exports.JACKPOT_CONFIG = JACKPOT_CONFIG;
module.exports.selectWinner = selectWinner;
