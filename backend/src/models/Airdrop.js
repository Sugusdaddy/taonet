const mongoose = require('mongoose');

const airdropSchema = new mongoose.Schema({
  recipient: { type: String, required: true, index: true },
  amount: { type: String, required: true },
  reason: { type: String, enum: ['task_reward', 'task', 'jackpot', 'achievement', 'referral', 'manual'], required: true },
  
  // Solana transaction info
  txSignature: { type: String, index: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true },
  
  // Related entities
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  proofId: { type: mongoose.Schema.Types.ObjectId, ref: 'InferenceProof' },
  rewardId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  completedAt: { type: Date },
  
  // Error tracking
  error: { type: String },
  retries: { type: Number, default: 0 }
});

// Index for finding pending airdrops
airdropSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Airdrop', airdropSchema);
