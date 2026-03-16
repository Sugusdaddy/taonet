const Task = require('../models/Task');
const InferenceProof = require("../models/InferenceProof");
const activityRoutes = require('../routes/activity');
const Miner = require('../models/Miner');
const Reward = require('../models/Reward');
const Jackpot = require('../models/Jackpot');
const { checkAchievements } = require('../achievements');
const { WebSocket } = require('ws');

// Global task counter for jackpots
let globalTaskCounter = 0;

class TaskController {
  // Submit a new task
  static async submit(req, res) {
    try {
      const { type, prompt, options = {}, rewardPool = '1000000000000000000' } = req.body;
      
      if (!type || !prompt) {
        return res.status(400).json({ error: 'Type and prompt are required' });
      }
      
      const validTypes = ['text', 'code', 'image', 'trading', 'custom'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid task type' });
      }
      
      const task = new Task({
        type,
        prompt,
        options,
        requester: req.body.requester || 'api',
        rewardPool,
        priority: options.priority || 0,
        expiresAt: new Date(Date.now() + (options.timeoutMs || 30 * 60 * 1000))
      });
      
      await task.save();
      
      // Try to assign immediately
      await TaskController.assignTask(task);
      
      res.json({
        success: true,
        task: {
          id: task._id,
          type: task.type,
          status: task.status,
          createdAt: task.createdAt
        }
      });
    } catch (error) {
      console.error('Task submit error:', error);
      res.status(500).json({ error: 'Failed to submit task' });
    }
  }
  
  // Assign task to an available miner
  static async assignTask(task) {
    try {
      // Get online miners sorted by reputation and completion rate
      const onlineMiners = [];
      
      for (const [address, data] of global.activeMiners) {
        if (data.miner && data.miner.status === 'online') {
          onlineMiners.push({
            address,
            ws: data.ws,
            miner: data.miner
          });
        }
      }
      
      if (onlineMiners.length === 0) {
        console.log(`No eligible miners available for task: ${task._id}`);
        return false;
      }
      
      // Sort by reputation * level * totalMultiplier (higher = more priority)
      onlineMiners.sort((a, b) => {
        const scoreA = a.miner.reputation * a.miner.level * (a.miner.multipliers?.staking || 1);
        const scoreB = b.miner.reputation * b.miner.level * (b.miner.multipliers?.staking || 1);
        return scoreB - scoreA;
      });
      
      // Select top miner (could randomize among top candidates)
      const selected = onlineMiners[0];
      
      // Update task
      task.status = 'assigned';
      task.assignedMiner = selected.address;
      task.assignedAt = new Date();
      await task.save();
      
      // Update miner status
      selected.miner.status = 'busy';
      await selected.miner.save();
      
      // Send task to miner via WebSocket
      if (selected.ws && selected.ws.readyState === WebSocket.OPEN) {
        selected.ws.send(JSON.stringify({
          type: 'task',
          task: {
            id: task._id,
            type: task.type,
            prompt: task.prompt,
            options: task.options,
            rewardPool: task.rewardPool,
            expiresAt: task.expiresAt
          }
        }));
      }
      
      console.log(`Task ${task._id} assigned to miner ${selected.address}`);
      return true;
    } catch (error) {
      console.error('Task assignment error:', error);
      return false;
    }
  }
  
  // Handle task response from miner
  static async handleResponse(task, minerAddress, response) {
    try {
      const miner = await Miner.findOne({ address: minerAddress.toLowerCase() });
      if (!miner) return { error: 'Miner not found' };
      
      const responseTime = Date.now() - new Date(task.assignedAt).getTime();
      
      // Add response to task
      task.responses.push({
        miner: minerAddress.toLowerCase(),
        response,
        submittedAt: new Date(),
        responseTime
      });
      
      // Calculate response time for proof
      

      // Update miner stats
      miner.stats.totalTasks += 1;
      miner.status = 'online';
      
      // Update streak
      await miner.updateStreak();
      
      // Calculate XP based on response (base + speed bonus)
      let xpEarned = 10; // Base XP
      if (responseTime < 1000) xpEarned += 10; // Speed bonus
      else if (responseTime < 3000) xpEarned += 5;
      
      // Apply multipliers
      const totalMultiplier = 
        (miner.multipliers?.staking || 1) * 
        (miner.multipliers?.streak || 1) * 
        (miner.multipliers?.level || 1) * 
        (miner.multipliers?.achievement || 1);
      
      xpEarned = Math.floor(xpEarned * totalMultiplier);
      
      // Add XP
      const levelResult = await miner.addXp(xpEarned);
      
      await task.save();
      
      // Increment global task counter and check jackpots
      globalTaskCounter++;
      const jackpotResult = await TaskController.checkJackpot(miner, task);
      
      // Check achievements
      const newAchievements = await checkAchievements(miner);
      
      return {
        success: true,
        xpEarned,
        totalMultiplier: totalMultiplier.toFixed(2),
        leveledUp: levelResult.leveledUp,
        newLevel: levelResult.newLevel,
        streak: miner.currentStreak,
        jackpotWin: jackpotResult,
        newAchievements
      };
    } catch (error) {
      console.error('Handle response error:', error);
      return { error: 'Failed to process response' };
    }
  }
  
  // Check and process jackpots
  static async checkJackpot(miner, task) {
    try {
      // Find active jackpots
      const jackpots = await Jackpot.find({ status: 'active' });
      
      for (const jackpot of jackpots) {
        jackpot.currentCount += 1;
        
        // Add miner to entries (weighted by tier)
        const tierTickets = {
          bronze: 1,
          silver: 2,
          gold: 4,
          platinum: 8,
          diamond: 16
        };
        
        const existingEntry = jackpot.entries.find(e => e.miner === miner.address);
        if (existingEntry) {
          existingEntry.tickets += tierTickets[miner.stakingTier] || 1;
        } else {
          jackpot.entries.push({
            miner: miner.address,
            tickets: tierTickets[miner.stakingTier] || 1
          });
        }
        
        // Check if jackpot triggers
        if (jackpot.currentCount >= jackpot.triggerAt) {
          // Select winner
          const winner = selectWinner(jackpot.entries);
          
          // Calculate prize with multiplier
          const basePrize = BigInt(jackpot.poolAmount);
          const prize = (basePrize * BigInt(jackpot.multiplier)).toString();
          
          // Update jackpot
          jackpot.status = 'completed';
          jackpot.winner = {
            address: winner,
            amount: prize,
            timestamp: new Date(),
            taskId: task._id
          };
          jackpot.completedAt = new Date();
          
          // Create reward for winner
          const reward = new Reward({
            miner: winner,
            type: 'jackpot',
            amount: prize,
            xpEarned: jackpot.type === 'ultra' ? 5000 : jackpot.type === 'mega' ? 1000 : 500,
            status: 'pending',
            jackpot: jackpot._id,
            notes: `${jackpot.type.toUpperCase()} Jackpot Win! ${jackpot.multiplier}x multiplier`
          });
          await reward.save();
          
          // Update winner stats
          const winnerMiner = await Miner.findOne({ address: winner });
          if (winnerMiner) {
            winnerMiner.stats.jackpotsWon += 1;
            winnerMiner.stats.jackpotEarnings = (
              BigInt(winnerMiner.stats.jackpotEarnings || '0') + BigInt(prize)
            ).toString();
            await winnerMiner.addXp(jackpot.type === 'ultra' ? 5000 : jackpot.type === 'mega' ? 1000 : 500);
            await checkAchievements(winnerMiner);
          }
          
          // Create new jackpot of same type
          await createJackpot(jackpot.type);
          
          // Broadcast jackpot win
          broadcastToMiners({
            type: 'jackpot_win',
            jackpotType: jackpot.type,
            winner: winner.slice(0, 10) + '...',
            amount: prize,
            multiplier: jackpot.multiplier
          });
          
          await jackpot.save();
          
          // Return if current miner won
          if (winner === miner.address) {
            return {
              won: true,
              type: jackpot.type,
              amount: prize,
              multiplier: jackpot.multiplier
            };
          }
        } else {
          await jackpot.save();
        }
      }
      
      return null;
    } catch (error) {
      console.error('Jackpot check error:', error);
      return null;
    }
  }
  
  // Complete task and distribute rewards
  static async completeTask(taskId, winningResponse) {
    try {
      const task = await Task.findById(taskId);
      if (!task) return { error: 'Task not found' };
      
      const miner = await Miner.findOne({ address: winningResponse.miner });
      if (!miner) return { error: 'Miner not found' };
      
      // Calculate reward with multipliers
      const baseReward = BigInt(task.rewardPool);
      const totalMultiplier = 
        (miner.multipliers?.staking || 1) * 
        (miner.multipliers?.streak || 1) * 
        (miner.multipliers?.level || 1) * 
        (miner.multipliers?.achievement || 1);
      
      const finalReward = BigInt(Math.floor(Number(baseReward) * totalMultiplier));
      
      // Create reward
      const reward = new Reward({
        miner: miner.address,
        type: 'task',
        amount: finalReward.toString(),
        multipliers: {
          base: 1,
          staking: miner.multipliers?.staking || 1,
          streak: miner.multipliers?.streak || 1,
          level: miner.multipliers?.level || 1,
          achievement: miner.multipliers?.achievement || 1,
          total: totalMultiplier
        },
        task: task._id,
        xpEarned: 0, // XP already given on response
        status: 'pending'
      });
      await reward.save();
      
      // Update task
      task.status = 'completed';
      task.completedAt = new Date();
      task.rewardDistributed = true;
      await task.save();
      
      // Calculate response time for proof
      const responseTime = (winningResponse.submittedAt && task.assignedAt) ? new Date(winningResponse.submittedAt) - new Date(task.assignedAt) : winningResponse.processingTime || 1000;
      

      // Update miner stats
      // Create verifiable inference proof
      try {
        const proof = await InferenceProof.createProof(
          task._id,
          miner.address,
          task.prompt,
          winningResponse.response?.response || winningResponse.response || "",
          {
            tokensGenerated: winningResponse.response?.tokensGenerated || 0,
            processingTimeMs: responseTime,
            model: "Llama-3.2-1B"
          }
        );
        console.log(`Inference proof created: block #${proof.blockNumber} hash ${proof.blockHash.slice(0,18)}...`);
      } catch (proofErr) {
        console.error("Failed to create proof:", proofErr.message);
      }

      miner.stats.completedTasks += 1;
      miner.stats.successfulTasks += 1;
      miner.stats.totalRewards = (
        BigInt(miner.stats.totalRewards || '0') + finalReward
      ).toString();
      
      // Update avg response time
      
      miner.stats.avgResponseTime = Math.floor(
        (miner.stats.avgResponseTime * (miner.stats.completedTasks - 1) + responseTime) / 
        miner.stats.completedTasks
      );
      
      // Update avg score
      if (winningResponse.score) {
        miner.stats.avgScore = Math.floor(
          (miner.stats.avgScore * (miner.stats.completedTasks - 1) + winningResponse.score) / 
          miner.stats.completedTasks
        );
      }
      
      await miner.save();
      
      // Check achievements
      await checkAchievements(miner);
      
      return {
        success: true,
        reward: finalReward.toString(),
        multiplier: totalMultiplier.toFixed(2)
      };
    } catch (error) {
      console.error('Complete task error:', error);
      return { error: 'Failed to complete task' };
    }
  }
  
  // Get task by ID
  static async getTask(req, res) {
    try {
      const task = await Task.findById(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({ task });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get task' });
    }
  }
  
  // Get task result (long poll)
  static async getResult(req, res) {
    try {
      const { taskId } = req.params;
      const timeout = parseInt(req.query.timeout) || 30000;
      const startTime = Date.now();
      
      const checkResult = async () => {
        const task = await Task.findById(taskId);
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        
        // If task is completed or has responses with scores
        if (task.status === 'completed' || 
            (task.responses.length > 0 && task.responses[0].score !== undefined)) {
          const bestResponse = task.responses.reduce((best, current) => {
            if (!best || (current.score || 0) > (best.score || 0)) {
              return current;
            }
            return best;
          }, null);
          
          return res.json({
            success: true,
            result: bestResponse?.response,
            miner: bestResponse?.miner,
            score: bestResponse?.score
          });
        }
        
        // If timed out or expired
        if (Date.now() - startTime > timeout || task.status === 'expired') {
          return res.json({
            success: false,
            status: task.status,
            message: 'Task not yet completed'
          });
        }
        
        // Wait and check again
        setTimeout(checkResult, 1000);
      };
      
      await checkResult();
    } catch (error) {
      console.error('Get result error:', error);
      res.status(500).json({ error: 'Failed to get result' });
    }
  }
  
  // List tasks
  static async list(req, res) {
    try {
      const { status, type, limit = 20 } = req.query;
      const query = {};
      
      if (status) query.status = status;
      if (type) query.type = type;
      
      const tasks = await Task.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
      
      res.json({ tasks });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list tasks' });
    }
  }
}

// Helper functions
function selectWinner(entries) {
  const totalTickets = entries.reduce((sum, e) => sum + e.tickets, 0);
  let random = Math.random() * totalTickets;
  
  for (const entry of entries) {
    random -= entry.tickets;
    if (random <= 0) {
      return entry.miner;
    }
  }
  
  return entries[entries.length - 1].miner;
}

async function createJackpot(type) {
  const config = {
    mini: { triggerEvery: 50, basePool: '1000000000000000000' },
    regular: { triggerEvery: 500, basePool: '10000000000000000000' },
    mega: { triggerEvery: 5000, basePool: '100000000000000000000' },
    ultra: { triggerEvery: 50000, basePool: '1000000000000000000000' }
  };
  
  const c = config[type];
  const multiplierRange = type === 'ultra' ? [1000, 10000] : 
                          type === 'mega' ? [200, 1000] :
                          type === 'regular' ? [50, 200] : [10, 50];
  
  const multiplier = Math.floor(
    Math.random() * (multiplierRange[1] - multiplierRange[0]) + multiplierRange[0]
  );
  
  const jackpot = new Jackpot({
    type,
    poolAmount: c.basePool,
    triggerAt: c.triggerEvery,
    multiplier,
    status: 'active'
  });
  
  await jackpot.save();
  return jackpot;
}

function broadcastToMiners(message) {
  for (const [address, data] of global.activeMiners) {
    if (data.ws && data.ws.readyState === WebSocket.OPEN) {
      data.ws.send(JSON.stringify(message));
    }
  }
}

// Initialize jackpots on startup
async function initJackpots() {
  const types = ['mini', 'regular', 'mega', 'ultra'];
  
  for (const type of types) {
    const existing = await Jackpot.findOne({ type, status: 'active' });
    if (!existing) {
      await createJackpot(type);
      console.log(`Created ${type} jackpot`);
    }
  }
}

// Call on module load
initJackpots().catch(console.error);

module.exports = { TaskController };
