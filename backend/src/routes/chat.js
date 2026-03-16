const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Knowledge = require('../models/Knowledge');

// Chat endpoint - submit tasks and get responses
router.post('/', async (req, res) => {
  try {
    const { message, wallet } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // First check knowledge base for existing answer
    const knowledge = await Knowledge.findOne({
      $text: { $search: message }
    }).sort({ score: { $meta: 'textScore' } }).limit(1);

    if (knowledge && knowledge.confidence > 0.8) {
      return res.json({
        response: knowledge.response,
        source: 'knowledge_base',
        confidence: knowledge.confidence
      });
    }

    // Get a random task from pool or create custom
    const task = await Task.findOneAndUpdate(
      { status: 'pending' },
      { 
        status: 'assigned',
        assignedTo: wallet || 'chat',
        assignedAt: new Date(),
        customPrompt: message
      },
      { new: true }
    );

    if (!task) {
      // No pending tasks, create response from server
      return res.json({
        response: 'All miners are currently busy. Your question has been noted and will be processed soon.',
        queued: true
      });
    }

    // For now, return a placeholder - real response comes via WebSocket
    res.json({
      response: 'Processing your request...',
      taskId: task._id,
      status: 'processing'
    });

  } catch (error) {
    console.error('[Chat] Error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get chat history (optional)
router.get('/history', async (req, res) => {
  try {
    const { wallet, limit = 20 } = req.query;
    
    const knowledge = await Knowledge.find(
      wallet ? { source: wallet } : {}
    )
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
    
    res.json(knowledge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
