const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Miner = require('../models/Miner');
const InferenceProof = require('../models/InferenceProof');

// Solana-specialized system prompt
const SOLANA_SYSTEM_PROMPT = `You are SolanaGPT, an expert AI assistant specialized in Solana blockchain development. You have deep knowledge of:
- Solana architecture (accounts, programs, transactions, PDAs)
- Anchor framework for smart contract development
- Rust programming for Solana programs
- SPL tokens and token programs
- Metaplex for NFTs
- Solana Web3.js and wallet adapters
- DeFi protocols on Solana
- Best practices for security and optimization

Always provide practical, working code examples. Be concise but thorough.`;

// Query the model
router.post('/query', async (req, res) => {
  try {
    const { prompt, context, address } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }
    
    // Create task with Solana context
    const fullPrompt = context 
      ? `${SOLANA_SYSTEM_PROMPT}\n\nPrevious conversation:\n${context}\n\nUser: ${prompt}\n\nAssistant:`
      : `${SOLANA_SYSTEM_PROMPT}\n\nUser: ${prompt}\n\nAssistant:`;
    
    // Check for available miners
    let availableMiners = [];
    if (global.activeMiners) {
      for (const [addr, data] of global.activeMiners) {
        if (data.miner?.status === 'online' && data.ws?.readyState === 1) {
          availableMiners.push({ address: addr, ...data });
        }
      }
    }
    
    if (availableMiners.length === 0) {
      // Fallback: return a helpful message about Solana
      return res.json({
        response: "I'm currently waiting for miners to come online. While you wait, here are some Solana resources:\n\n- **Docs**: https://docs.solana.com\n- **Anchor**: https://anchor-lang.com\n- **Cookbook**: https://solanacookbook.com\n\nTry again in a moment!",
        miner: null,
        processingTime: 0,
        proofId: null,
        fallback: true
      });
    }
    
    // Select random miner
    const selected = availableMiners[Math.floor(Math.random() * availableMiners.length)];
    
    // Create task
    const task = new Task({
      type: 'text',
      prompt: fullPrompt,
      difficulty: 'expert',
      difficultyName: 'Expert',
      rewardPool: '2000000000000000000', // 2 tokens for playground
      requester: address || 'playground',
      priority: 1,
      status: 'assigned',
      assignedMiner: selected.address,
      assignedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      options: {
        isPlayground: true,
        maxTokens: 500
      }
    });
    await task.save();
    
    // Create promise to wait for response
    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 30000);
      
      // Store resolver in task
      if (!global.playgroundCallbacks) global.playgroundCallbacks = new Map();
      global.playgroundCallbacks.set(task._id.toString(), { resolve, reject, timeout });
    });
    
    // Send to miner
    selected.ws.send(JSON.stringify({
      type: 'task',
      task: {
        id: task._id,
        type: 'text',
        prompt: fullPrompt,
        isPlayground: true,
        maxTokens: 500
      }
    }));
    
    // Wait for response
    try {
      const result = await responsePromise;
      
      // Get the proof if created
      const proof = await InferenceProof.findOne({ task: task._id });
      
      res.json({
        response: result.response,
        miner: selected.address,
        processingTime: result.processingTime || 0,
        proofId: proof?._id
      });
    } catch (err) {
      // Cleanup
      global.playgroundCallbacks?.delete(task._id.toString());
      
      res.json({
        response: "The miner took too long to respond. Please try again.",
        miner: selected.address,
        processingTime: 0,
        proofId: null,
        timeout: true
      });
    }
    
  } catch (error) {
    console.error('Playground query error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get playground stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const queriesToday = await Task.countDocuments({
      'options.isPlayground': true,
      createdAt: { $gte: today }
    });
    
    const recentTasks = await Task.find({
      'options.isPlayground': true,
      status: 'completed'
    }).sort({ completedAt: -1 }).limit(20);
    
    let totalTime = 0;
    let count = 0;
    for (const task of recentTasks) {
      if (task.responses?.[0]?.responseTime) {
        totalTime += task.responses[0].responseTime;
        count++;
      }
    }
    
    res.json({
      queries: queriesToday,
      avgTime: count > 0 ? Math.round(totalTime / count) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
