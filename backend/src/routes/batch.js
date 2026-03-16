const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Batch job schema
const batchJobSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  owner: { type: String, required: true, index: true },
  name: String,
  tasks: [{
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    status: { type: String, default: 'pending' },
    result: mongoose.Schema.Types.Mixed
  }],
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending' },
  progress: { completed: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  webhookUrl: String,
  metadata: mongoose.Schema.Types.Mixed,
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

const BatchJob = mongoose.model('BatchJob', batchJobSchema);

// Create batch job
router.post('/create', async (req, res) => {
  try {
    const { owner, name, tasks, priority = 'normal', webhookUrl, metadata } = req.body;
    
    if (!owner || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Owner and tasks array required' });
    }
    
    if (tasks.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 tasks per batch' });
    }
    
    const batchId = `batch_${crypto.randomBytes(8).toString('hex')}`;
    
    // Create individual tasks
    const taskDocs = [];
    for (const taskData of tasks) {
      const task = new Task({
        type: taskData.type || 'text',
        prompt: taskData.prompt,
        params: taskData.parameters || {},
        requester: owner,
        batchId
      });
      await task.save();
      taskDocs.push({ taskId: task._id, status: 'pending' });
    }
    
    // Create batch job
    const batch = new BatchJob({
      batchId,
      owner,
      name: name || `Batch ${new Date().toISOString()}`,
      tasks: taskDocs,
      status: 'pending',
      progress: { completed: 0, total: tasks.length },
      priority,
      webhookUrl,
      metadata
    });
    
    await batch.save();
    
    res.json({
      success: true,
      batchId,
      taskCount: tasks.length,
      status: 'pending',
      estimatedTime: `${Math.ceil(tasks.length * 30 / 60)} minutes`
    });
    
  } catch (error) {
    console.error('Batch create error:', error);
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// Get batch status
router.get('/:batchId', async (req, res) => {
  try {
    const batch = await BatchJob.findOne({ batchId: req.params.batchId });
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    // Calculate progress
    const completed = batch.tasks.filter(t => t.status === 'completed').length;
    const failed = batch.tasks.filter(t => t.status === 'failed').length;
    
    res.json({
      batchId: batch.batchId,
      name: batch.name,
      status: batch.status,
      progress: {
        completed,
        failed,
        pending: batch.tasks.length - completed - failed,
        total: batch.tasks.length,
        percentage: Math.round((completed / batch.tasks.length) * 100)
      },
      createdAt: batch.createdAt,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to get batch status' });
  }
});

// Get batch results
router.get('/:batchId/results', async (req, res) => {
  try {
    const batch = await BatchJob.findOne({ batchId: req.params.batchId })
      .populate('tasks.taskId', 'type prompt result status');
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    const results = batch.tasks.map(t => ({
      taskId: t.taskId?._id,
      type: t.taskId?.type,
      prompt: t.taskId?.prompt?.slice(0, 100),
      status: t.status,
      result: t.result || t.taskId?.result
    }));
    
    res.json({
      batchId: batch.batchId,
      status: batch.status,
      results
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// List batches for owner
router.get('/list/:owner', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const batches = await BatchJob.find({ owner: req.params.owner })
      .select('batchId name status progress createdAt completedAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    
    const total = await BatchJob.countDocuments({ owner: req.params.owner });
    
    res.json({
      batches,
      pagination: { page: Number(page), limit: Number(limit), total }
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to list batches' });
  }
});

// Cancel batch
router.post('/:batchId/cancel', async (req, res) => {
  try {
    const { owner } = req.body;
    
    const batch = await BatchJob.findOneAndUpdate(
      { batchId: req.params.batchId, owner, status: { $in: ['pending', 'processing'] } },
      { status: 'cancelled' },
      { new: true }
    );
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found or cannot be cancelled' });
    }
    
    // Cancel pending tasks
    const pendingTaskIds = batch.tasks.filter(t => t.status === 'pending').map(t => t.taskId);
    await Task.updateMany(
      { _id: { $in: pendingTaskIds } },
      { status: 'cancelled' }
    );
    
    res.json({ success: true, message: 'Batch cancelled' });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel batch' });
  }
});

// Update batch task status (called internally when task completes)
async function updateBatchTask(taskId, status, result) {
  try {
    const batch = await BatchJob.findOne({ 'tasks.taskId': taskId });
    if (!batch) return;
    
    // Update task in batch
    const taskIndex = batch.tasks.findIndex(t => t.taskId.toString() === taskId.toString());
    if (taskIndex >= 0) {
      batch.tasks[taskIndex].status = status;
      batch.tasks[taskIndex].result = result;
    }
    
    // Update progress
    const completed = batch.tasks.filter(t => t.status === 'completed').length;
    const failed = batch.tasks.filter(t => t.status === 'failed').length;
    batch.progress.completed = completed + failed;
    
    // Check if batch is complete
    if (completed + failed === batch.tasks.length) {
      batch.status = failed === batch.tasks.length ? 'failed' : 'completed';
      batch.completedAt = new Date();
      
      // Send webhook if configured
      if (batch.webhookUrl) {
        try {
          await fetch(batch.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              batchId: batch.batchId,
              status: batch.status,
              completed,
              failed,
              total: batch.tasks.length
            })
          });
        } catch (e) {
          console.error('Webhook failed:', e);
        }
      }
    } else if (batch.status === 'pending') {
      batch.status = 'processing';
      batch.startedAt = new Date();
    }
    
    await batch.save();
  } catch (error) {
    console.error('Update batch task error:', error);
  }
}

module.exports = router;
module.exports.updateBatchTask = updateBatchTask;
module.exports.BatchJob = BatchJob;
