const mongoose = require('mongoose');

const ValidationSchema = new mongoose.Schema({
  // Task being validated
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  
  // Miner whose response is being validated
  miner: {
    type: String,
    required: true
  },
  
  // Validator (miner who validates)
  validator: {
    type: String,
    required: true
  },
  
  // Response index (optional)
  responseIndex: {
    type: Number,
    default: 0
  },
  
  // Overall score (0-100)
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  
  // Detailed scores
  scores: {
    accuracy: { type: Number, min: 0, max: 100, default: 50 },
    relevance: { type: Number, min: 0, max: 100, default: 50 },
    completeness: { type: Number, min: 0, max: 100, default: 50 },
    speed: { type: Number, min: 0, max: 100, default: 50 }
  },
  
  // Comments
  notes: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now }
});

// Index for lookups
ValidationSchema.index({ task: 1, miner: 1 });
ValidationSchema.index({ validator: 1 });

module.exports = mongoose.model('Validation', ValidationSchema);
