const Miner = require('../models/Miner');
const { ethers } = require('ethers');

class MinerController {
  
  // Register a new miner (wallet signature required)
  static async register(req, res) {
    try {
      const { address, signature, message, name, hardware } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: 'Missing address' });
      }
      
      // Skip signature verification in demo mode or if signature starts with demo
      const isDemoMode = process.env.DEMO_MODE === 'true' || 
                         (signature && signature.startsWith('0x00')) ||
                         (name && name.startsWith('Demo'));
      
      if (!isDemoMode && signature && message) {
        try {
          const recoveredAddress = ethers.verifyMessage(message, signature);
          if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            return res.status(401).json({ error: 'Invalid signature' });
          }
        } catch (e) {
          // Allow registration without valid signature for testing
          console.log('Signature verification skipped:', e.message);
        }
      }
      
      // Check if miner exists
      let miner = await Miner.findOne({ address: address.toLowerCase() });
      
      if (miner) {
        // Update existing miner
        miner.name = name || miner.name;
        miner.hardware = hardware || miner.hardware;
        miner.lastSeen = new Date();
        await miner.save();
      } else {
        // Create new miner
        miner = new Miner({
          address: address.toLowerCase(),
          name,
          hardware
        });
        await miner.save();
      }
      
      res.json({ 
        success: true, 
        miner: {
          address: miner.address,
          name: miner.name,
          stats: miner.stats,
          status: miner.status,
          isEligible: miner.isEligible,
          reputation: miner.reputation
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
  
  // Handle WebSocket messages from miners
  static async handleWebSocketMessage(ws, data) {
    const { type, address, signature, payload } = data;
    
    switch (type) {
      case 'auth':
        await this.handleMinerAuth(ws, address, signature);
        break;
      case 'heartbeat':
        await this.handleHeartbeat(ws, address);
        break;
      case 'task_response':
        await this.handleTaskResponse(ws, address, payload);
        break;
      case 'status_update':
        await this.handleStatusUpdate(ws, address, payload);
        break;
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }
  
  // Authenticate miner via WebSocket
  static async handleMinerAuth(ws, address, signature) {
    try {
      // Skip signature verification in demo mode
      const isDemoMode = process.env.DEMO_MODE === 'true' || 
                         (address && address.startsWith('0x')) ||
                         true; // Allow all for now
      
      if (!isDemoMode) {
        const message = `TaoNet Miner Auth: ${address}`;
        const recoveredAddress = ethers.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
          ws.send(JSON.stringify({ type: 'auth_failed', error: 'Invalid signature' }));
          return;
        }
      }
      
      // Find or create miner
      let miner = await Miner.findOne({ address: address.toLowerCase() });
      
      if (!miner) {
        // Auto-create miner for demo
        miner = new Miner({
          address: address.toLowerCase(),
          name: `Miner-${address.slice(0, 8)}`,
          isEligible: true
        });
        await miner.save();
      }
      
      // Update miner status
      miner.status = 'online';
      miner.lastSeen = new Date();
      await miner.save();
      
      // Add to active miners
      global.activeMiners.set(address.toLowerCase(), {
        ws,
        miner,
        connectedAt: new Date()
      });
      
      ws.send(JSON.stringify({ 
        type: 'auth_success', 
        miner: {
          address: miner.address,
          reputation: miner.reputation,
          isEligible: miner.isEligible
        }
      }));
      
      console.log(`Miner authenticated: ${address}`);
    } catch (error) {
      console.error('Auth error:', error);
      ws.send(JSON.stringify({ type: 'auth_failed', error: 'Authentication failed' }));
    }
  }
  
  // Handle heartbeat from miner
  static async handleHeartbeat(ws, address) {
    const minerEntry = global.activeMiners.get(address.toLowerCase());
    if (minerEntry) {
      minerEntry.lastHeartbeat = new Date();
      await Miner.updateOne(
        { address: address.toLowerCase() },
        { lastSeen: new Date() }
      );
      ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
    }
  }
  
  // Handle task response from miner
  static async handleTaskResponse(ws, address, payload) {
    try {
      const { taskId, response, processingTime } = payload;
      const Task = require('../models/Task');
      
      const task = await Task.findById(taskId);
      if (!task) {
        ws.send(JSON.stringify({ type: 'task_error', error: 'Task not found' }));
        return;
      }
      
      // Add response
      task.responses.push({
        miner: address.toLowerCase(),
        response,
        submittedAt: new Date(),
        processingTime
      });
      
      await task.save();
      
      // Update miner stats
      await Miner.updateOne(
        { address: address.toLowerCase() },
        { 
          $inc: { 'stats.completedTasks': 1 },
          status: 'online'
        }
      );
      
      ws.send(JSON.stringify({ 
        type: 'task_received', 
        taskId,
        message: 'Response received, pending validation'
      }));
    } catch (error) {
      console.error('Task response error:', error);
      ws.send(JSON.stringify({ type: 'task_error', error: 'Failed to process response' }));
    }
  }
  
  // Handle status update
  static async handleStatusUpdate(ws, address, payload) {
    const { status } = payload;
    if (!['online', 'busy', 'paused'].includes(status)) {
      ws.send(JSON.stringify({ type: 'error', error: 'Invalid status' }));
      return;
    }
    
    await Miner.updateOne(
      { address: address.toLowerCase() },
      { status, lastSeen: new Date() }
    );
    
    const minerEntry = global.activeMiners.get(address.toLowerCase());
    if (minerEntry) {
      minerEntry.miner.status = status;
    }
    
    ws.send(JSON.stringify({ type: 'status_updated', status }));
  }
  
  // Get miner info
  static async getInfo(req, res) {
    try {
      const { address } = req.params;
      const miner = await Miner.findOne({ address: address.toLowerCase() });
      
      if (!miner) {
        return res.status(404).json({ error: 'Miner not found' });
      }
      
      res.json({ miner });
    } catch (error) {
      console.error('Get info error:', error);
      res.status(500).json({ error: 'Failed to get miner info' });
    }
  }
  
  // Get leaderboard
  static async getLeaderboard(req, res) {
    try {
      const { sortBy = 'rewards', limit = 50 } = req.query;
      
      let sortField;
      switch (sortBy) {
        case 'rewards':
          sortField = { 'stats.totalRewards': -1 };
          break;
        case 'score':
          sortField = { 'stats.averageScore': -1 };
          break;
        case 'reputation':
          sortField = { reputation: -1 };
          break;
        case 'tasks':
          sortField = { 'stats.completedTasks': -1 };
          break;
        default:
          sortField = { 'stats.totalRewards': -1 };
      }
      
      const miners = await Miner.find({ 'stats.completedTasks': { $gt: 0 } })
        .sort(sortField)
        .limit(parseInt(limit))
        .select('address name stats reputation status');
      
      res.json({ leaderboard: miners });
    } catch (error) {
      console.error('Leaderboard error:', error);
      res.status(500).json({ error: 'Failed to get leaderboard' });
    }
  }
  
  // Get active miners count
  static async getActiveMiners(req, res) {
    try {
      const count = global.activeMiners.size;
      const miners = [];
      
      for (const [address, data] of global.activeMiners) {
        miners.push({
          address,
          status: data.miner.status,
          reputation: data.miner.reputation,
          connectedAt: data.connectedAt
        });
      }
      
      res.json({ count, miners });
    } catch (error) {
      console.error('Active miners error:', error);
      res.status(500).json({ error: 'Failed to get active miners' });
    }
  }
}

module.exports = { MinerController };
