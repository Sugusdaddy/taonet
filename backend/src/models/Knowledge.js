const mongoose = require('mongoose');

const KnowledgeSchema = new mongoose.Schema({
  question: { type: String, required: true, index: true },
  questionLower: { type: String, index: true },
  answer: { type: String, required: true },
  category: { type: String, index: true },
  quality: { type: Number, default: 0 },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  usageCount: { type: Number, default: 0 },
  minedBy: { type: String },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Text search index
KnowledgeSchema.index({ question: 'text', answer: 'text' });

module.exports = mongoose.model('Knowledge', KnowledgeSchema);
