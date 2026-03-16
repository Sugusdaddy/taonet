const mongoose = require('mongoose');

const penaltySchema = new mongoose.Schema({
  // Miner who received the penalty
  miner: {
    type: String,
    required: true,
    index: true
  },
  
  // Penalty type
  type: {
    type: String,
    enum: [
      'task_timeout',      // Didn't complete task in time
      'task_failed',       // Task failed quality check
      'low_quality',       // Consistently low quality
      'spam',              // Spam behavior detected
      'invalid_response',  // Invalid/malformed response
      'offline_penalty',   // Went offline during task
      'abuse'              // Abuse detected
    ],
    required: true
  },
  
  // Severity
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe', 'critical'],
    default: 'minor'
  },
  
  // Impact
  reputationLoss: {
    type: Number,
    default: 0
  },
  
  // Related task if applicable
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  
  // Details
  reason: String,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'appealed', 'resolved', 'expired'],
    default: 'active'
  },
  
  // Appeal info
  appeal: {
    submitted: Boolean,
    submittedAt: Date,
    reason: String,
    resolvedAt: Date,
    resolution: String
  },
  
  // Expiration (penalties can expire)
  expiresAt: Date
}, {
  timestamps: true
});

penaltySchema.index({ miner: 1, status: 1 });
penaltySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Penalty', penaltySchema);
