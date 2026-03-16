const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Knowledge = require('../models/Knowledge');

// Search knowledge base for similar questions
async function searchKnowledge(query) {
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter(w => w.length > 3);
  
  // Try exact match first
  let match = await Knowledge.findOne({ questionLower: queryLower, answer: { $exists: true, $ne: '' } });
  if (match) {
    match.usageCount++;
    await match.save();
    return match;
  }
  
  // Try text search
  if (words.length > 0) {
    const searchQuery = words.join(' ');
    const results = await Knowledge.find(
      { $text: { $search: searchQuery }, answer: { $exists: true, $ne: '' } },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } }).limit(5);
    
    if (results.length > 0 && results[0].answer) {
      results[0].usageCount++;
      await results[0].save();
      return results[0];
    }
  }
  
  // Try keyword matching
  for (const word of words) {
    const keywordMatch = await Knowledge.findOne({
      questionLower: { $regex: word, $options: 'i' },
      answer: { $exists: true, $ne: '' }
    });
    if (keywordMatch) {
      keywordMatch.usageCount++;
      await keywordMatch.save();
      return keywordMatch;
    }
  }
  
  return null;
}

// Query endpoint
router.post('/query', async (req, res) => {
  try {
    const { prompt, address } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }
    
    // First, search knowledge base
    const knowledge = await searchKnowledge(prompt);
    if (knowledge && knowledge.answer) {
      console.log('[Playground] Knowledge hit: "' + prompt.slice(0,40) + '..."');
      return res.json({
        response: knowledge.answer,
        miner: knowledge.minedBy || 'knowledge_base',
        processingTime: 0,
        proofId: knowledge.taskId,
        fromKnowledge: true,
        category: knowledge.category
      });
    }
    
    // No knowledge found, check for miners
    let availableMiners = [];
    if (global.activeMiners) {
      for (const [addr, data] of global.activeMiners) {
        if (data.ws?.readyState === 1) {
          availableMiners.push({ address: addr, ...data });
        }
      }
    }
    
    if (availableMiners.length === 0) {
      // Queue the question as a pending task instead of Knowledge (which requires answer)
      const task = new Task({
        type: 'text',
        prompt,
        difficulty: 'expert',
        requester: address || 'playground',
        priority: 2,
        status: 'pending',
        options: { isPlayground: true, maxTokens: 500, category: detectCategory(prompt) }
      });
      await task.save();
      
      return res.json({
        response: "Your question has been queued for miners. Currently no miners are online. Try again later or start mining at /mine to help build our knowledge base!",
        miner: null,
        processingTime: 0,
        proofId: task._id,
        queued: true
      });
    }
    
    // Send to miner
    const selected = availableMiners[Math.floor(Math.random() * availableMiners.length)];
    
    const task = new Task({
      type: 'text',
      prompt,
      difficulty: 'expert',
      requester: address || 'playground',
      priority: 1,
      status: 'assigned',
      assignedMiner: selected.address,
      assignedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      options: { isPlayground: true, maxTokens: 500, category: detectCategory(prompt) }
    });
    await task.save();
    
    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 30000);
      if (!global.playgroundCallbacks) global.playgroundCallbacks = new Map();
      global.playgroundCallbacks.set(task._id.toString(), { resolve, reject, timeout });
    });
    
    selected.ws.send(JSON.stringify({
      type: 'task',
      task: {
        id: task._id.toString(),
        _id: task._id.toString(),
        prompt,
        taskType: 'text',
        isPlayground: true,
        maxTokens: 500
      }
    }));
    
    console.log('[Playground] Query to miner: "' + prompt.slice(0,40) + '..."');
    
    try {
      const result = await responsePromise;
      res.json({
        response: result.response,
        miner: selected.address,
        processingTime: result.processingTime || 0,
        proofId: task._id,
        fromMiner: true
      });
    } catch (err) {
      global.playgroundCallbacks?.delete(task._id.toString());
      res.json({
        response: "The miner took too long. Your question has been saved and will be answered when miners are available.",
        miner: selected.address,
        processingTime: 0,
        proofId: null,
        timeout: true
      });
    }
    
  } catch (error) {
    console.error('Playground error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Detect category from prompt
function detectCategory(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('anchor')) return 'anchor';
  if (lower.includes('rust') || lower.includes('program')) return 'rust';
  if (lower.includes('token') || lower.includes('spl')) return 'tokens';
  if (lower.includes('nft') || lower.includes('metaplex')) return 'nfts';
  if (lower.includes('defi') || lower.includes('swap') || lower.includes('jupiter')) return 'defi';
  if (lower.includes('web3') || lower.includes('javascript')) return 'web3js';
  if (lower.includes('security') || lower.includes('audit')) return 'security';
  if (lower.includes('optimize') || lower.includes('compute')) return 'optimization';
  return 'basics';
}

// Stats endpoint
router.get('/stats', async (req, res) => {
  try {
    const totalKnowledge = await Knowledge.countDocuments({ answer: { $exists: true, $ne: '' } });
    const pendingQuestions = await Task.countDocuments({ status: 'pending', 'options.isPlayground': true });
    
    res.json({
      knowledge: totalKnowledge,
      pending: pendingQuestions,
      minersOnline: global.activeMiners?.size || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Browse knowledge
router.get('/knowledge', async (req, res) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;
    const query = { answer: { $exists: true, $ne: '' } };
    if (category) query.category = category;
    
    const items = await Knowledge.find(query)
      .sort({ usageCount: -1, createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .select('question answer category usageCount minedBy createdAt');
    
    const total = await Knowledge.countDocuments(query);
    
    res.json({ items, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
