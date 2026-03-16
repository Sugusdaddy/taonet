const Task = require('../models/Task');
const Miner = require('../models/Miner');
const TaskDifficulty = require('./taskDifficulty');
const { WebSocket } = require('ws');

class TaskGenerator {
  constructor() {
    this.interval = null;
    this.intervalMs = parseInt(process.env.TASK_INTERVAL) || 15000;
  }

  start() {
    console.log(`[TaskGen] Started - interval ${this.intervalMs/1000}s`);
    this.interval = setInterval(() => this.generate(), this.intervalMs);
    this.generate(); // Run immediately
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('[TaskGen] Stopped');
    }
  }

  async generate() {
    try {
      // Get available miners (online and not busy)
      const availableMiners = [];
      
      if (global.activeMiners) {
        for (const [address, data] of global.activeMiners) {
          if (data.miner && data.miner.status === 'online' && data.ws?.readyState === WebSocket.OPEN) {
            availableMiners.push({
              address,
              miner: data.miner,
              ws: data.ws
            });
          }
        }
      }

      console.log(`[TaskGen] ${availableMiners.length} miners available`);
      
      if (availableMiners.length === 0) return;

      // Generate task for each available miner based on their level
      for (const minerData of availableMiners) {
        // Check if miner already has a pending task
        const pendingTask = await Task.findOne({
          assignedMiner: minerData.address,
          status: { $in: ['pending', 'assigned'] }
        });
        
        if (pendingTask) continue;

        // Generate task appropriate for miner's level
        const taskData = TaskDifficulty.generateTask(minerData.miner);
        
        const task = new Task({
          type: taskData.type,
          prompt: taskData.prompt,
          difficulty: taskData.difficulty,
          difficultyName: taskData.difficultyName,
          rewardPool: taskData.rewardPool,
          rewardMultiplier: taskData.rewardMultiplier,
          xpMultiplier: taskData.xpMultiplier,
          maxTokens: taskData.maxTokens,
          requester: 'system',
          priority: 0,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          status: 'assigned',
          assignedMiner: minerData.address,
          assignedAt: new Date()
        });
        
        await task.save();

        // Update miner status
        minerData.miner.status = 'busy';
        await minerData.miner.save();

        // Send to miner
        minerData.ws.send(JSON.stringify({
          type: 'task',
          task: {
            id: task._id,
            type: task.type,
            prompt: task.prompt,
            difficulty: task.difficulty,
            difficultyName: task.difficultyName,
            difficultyColor: taskData.difficultyColor,
            rewardPool: task.rewardPool,
            rewardMultiplier: task.rewardMultiplier,
            xpMultiplier: task.xpMultiplier,
            maxTokens: task.maxTokens,
            expiresAt: task.expiresAt
          }
        }));

        console.log(`[TaskGen] Task ${task._id.toString().slice(-6)} [${taskData.difficultyName}] -> ${minerData.address.slice(0,8)} (prompt: "${task.prompt.slice(0,30)}...")`);
      }
    } catch (error) {
      console.error('[TaskGen] Error:', error.message);
    }
  }
}

module.exports = new TaskGenerator();
