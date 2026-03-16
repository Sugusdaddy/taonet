const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  // Task type
  type: {
    type: String,
    enum: ['text', 'image', 'code', 'trading', 'custom'],
    required: true
  },
  
  // Task status
  status: {
    type: String,
    enum: ['pending', 'assigned', 'processing', 'evaluating', 'validating', 'completed', 'failed', 'expired'],
    default: 'pending'
  },
  
  // The actual prompt/query
  prompt: {
    type: String,
    required: true
  },
  
  // Additional parameters
  params: {
    model: String,
    maxTokens: Number,
    temperature: Number,
    custom: mongoose.Schema.Types.Mixed
  },
  
  // Who requested this task (wallet address or 'api')
  requester: {
    type: String,
    required: true
  },
  
  // Assigned miner
  assignedMiner: {
    type: String,
    ref: 'Miner'
  },
  
  // All responses from miners
  responses: [{
    miner: { type: String, ref: 'Miner' },
    response: mongoose.Schema.Types.Mixed,
    submittedAt: Date,
    score: Number,
    validationNotes: String
  }],
  
  // Best response (selected after validation)
  bestResponse: {
    miner: String,
    response: mongoose.Schema.Types.Mixed,
    score: Number
  },
  
  // Reward pool for this task (in token wei)
  rewardPool: {
    type: String,
    default: '0'
  },
  
  // Reward distributed flag
  rewardDistributed: {
    type: Boolean,
    default: false
  },
  
  // Priority (higher = processed first)
  priority: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  assignedAt: Date,
  completedAt: Date,
  expiresAt: Date
});

// Indexes
TaskSchema.index({ status: 1, createdAt: -1 });
TaskSchema.index({ type: 1, status: 1 });
TaskSchema.index({ assignedMiner: 1 });
TaskSchema.index({ requester: 1 });

module.exports = mongoose.model('Task', TaskSchema);
