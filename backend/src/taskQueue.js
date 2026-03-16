/**
 * Task Queue System
 * Intelligent task distribution with priority queuing
 */

const Task = require('./models/Task');
const Miner = require('./models/Miner');
const { calculateTaskDifficulty, checkDifficultyEligibility } = require('./difficulty');

class TaskQueue {
  constructor() {
    this.queues = {
      high: [],    // Priority tasks
      normal: [],  // Standard tasks
      low: []      // Background tasks
    };
    this.processing = new Set();
    this.assignmentHistory = new Map(); // Track recent assignments per miner
    this.metrics = {
      totalQueued: 0,
      totalAssigned: 0,
      avgWaitTime: 0,
      assignmentsByMiner: new Map()
    };
  }

  // Add task to queue
  async enqueue(task, priority = 'normal') {
    const queuedTask = {
      task,
      priority,
      queuedAt: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };
    
    this.queues[priority].push(queuedTask);
    this.metrics.totalQueued++;
    
    // Trigger immediate assignment attempt
    this.processQueue();
    
    return queuedTask;
  }

  // Process queue and assign tasks
  async processQueue() {
    const onlineMiners = this.getAvailableMiners();
    
    if (onlineMiners.length === 0) return;
    
    // Process high priority first, then normal, then low
    for (const priority of ['high', 'normal', 'low']) {
      while (this.queues[priority].length > 0 && onlineMiners.length > 0) {
        const queuedTask = this.queues[priority][0];
        
        // Skip if already being processed
        if (this.processing.has(queuedTask.task._id.toString())) {
          this.queues[priority].shift();
          continue;
        }
        
        // Find best miner for this task
        const bestMiner = await this.findBestMiner(queuedTask.task, onlineMiners);
        
        if (bestMiner) {
          this.queues[priority].shift();
          this.processing.add(queuedTask.task._id.toString());
          
          await this.assignTask(queuedTask, bestMiner);
          
          // Remove miner from available pool temporarily
          const minerIndex = onlineMiners.findIndex(m => m.address === bestMiner.address);
          if (minerIndex > -1) onlineMiners.splice(minerIndex, 1);
        } else {
          // No suitable miner, try again later
          break;
        }
      }
    }
  }

  // Get available miners
  getAvailableMiners() {
    const miners = [];
    
    global.activeMiners.forEach((ws, address) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        miners.push({
          address,
          ws,
          currentTasks: this.getCurrentTaskCount(address)
        });
      }
    });
    
    // Filter miners who have capacity
    return miners.filter(m => m.currentTasks < 3);
  }

  // Get current task count for miner
  getCurrentTaskCount(minerAddress) {
    let count = 0;
    this.processing.forEach(taskId => {
      // Check if task is assigned to this miner
      // This would need task-miner mapping
    });
    return count;
  }

  // Find best miner for task
  async findBestMiner(task, availableMiners) {
    const difficulty = calculateTaskDifficulty(task);
    const candidates = [];
    
    for (const minerInfo of availableMiners) {
      const miner = await Miner.findOne({ address: minerInfo.address });
      if (!miner) continue;
      
      // Check capability
      if (!miner.capabilities.includes(task.type)) continue;
      
      // Check difficulty eligibility
      const eligibility = checkDifficultyEligibility(miner, difficulty);
      if (!eligibility.eligible) continue;
      
      // Calculate score
      let score = 0;
      
      // Reputation weight (0-100)
      score += miner.reputation;
      
      // Success rate bonus
      const successRate = miner.tasksCompleted > 0 
        ? (miner.tasksCompleted / (miner.tasksCompleted + (miner.stats.tasksFailed || 0))) * 100
        : 50;
      score += successRate / 2;
      
      // Fair distribution - penalize recent heavy assignments
      const recentAssignments = this.assignmentHistory.get(minerInfo.address) || 0;
      score -= recentAssignments * 10;
      
      // Streak bonus (reliability)
      score += Math.min(20, miner.currentStreak);
      
      // Tier bonus
      const tierBonus = { bronze: 0, silver: 5, gold: 10, platinum: 15, diamond: 20 };
      score += tierBonus[miner.stakingTier] || 0;
      
      candidates.push({
        miner,
        minerInfo,
        score
      });
    }
    
    if (candidates.length === 0) return null;
    
    // Sort by score and pick best
    candidates.sort((a, b) => b.score - a.score);
    
    // Add some randomness for top candidates
    const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
    const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    
    return selected.miner;
  }

  // Assign task to miner
  async assignTask(queuedTask, miner) {
    const { task, queuedAt } = queuedTask;
    
    try {
      // Update task status
      task.status = 'assigned';
      task.assignedTo = miner.address;
      task.assignedAt = new Date();
      await task.save();
      
      // Get WebSocket connection
      const ws = global.activeMiners.get(miner.address);
      if (!ws || ws.readyState !== 1) {
        throw new Error('Miner not connected');
      }
      
      // Send task to miner
      ws.send(JSON.stringify({
        type: 'task_assigned',
        task: {
          id: task._id,
          type: task.type,
          prompt: task.prompt,
          parameters: task.parameters,
          difficulty: calculateTaskDifficulty(task),
          timeout: this.getTimeout(task)
        }
      }));
      
      // Update metrics
      this.metrics.totalAssigned++;
      this.updateAssignmentHistory(miner.address);
      
      const waitTime = Date.now() - queuedAt;
      this.updateAvgWaitTime(waitTime);
      
      // Set timeout for task
      this.setTaskTimeout(task._id.toString(), miner.address, this.getTimeout(task));
      
      console.log(`Task ${task._id} assigned to ${miner.address}`);
      
    } catch (error) {
      console.error('Task assignment error:', error);
      
      // Requeue task
      queuedTask.attempts++;
      if (queuedTask.attempts < queuedTask.maxAttempts) {
        this.queues[queuedTask.priority].unshift(queuedTask);
      } else {
        // Mark task as failed
        task.status = 'failed';
        task.error = 'Max assignment attempts exceeded';
        await task.save();
      }
      
      this.processing.delete(task._id.toString());
    }
  }

  // Get timeout for task
  getTimeout(task) {
    const difficulty = calculateTaskDifficulty(task);
    const timeouts = {
      easy: 60000,
      medium: 120000,
      hard: 300000,
      expert: 600000
    };
    return timeouts[difficulty] || 120000;
  }

  // Set timeout for task completion
  setTaskTimeout(taskId, minerAddress, timeout) {
    setTimeout(async () => {
      // Check if task is still processing
      if (this.processing.has(taskId)) {
        const task = await Task.findById(taskId);
        
        if (task && task.status === 'assigned') {
          console.log(`Task ${taskId} timed out`);
          
          task.status = 'failed';
          task.error = 'Task timeout';
          await task.save();
          
          this.processing.delete(taskId);
          
          // Issue penalty to miner
          const { issuePenalty } = require('./penalties');
          await issuePenalty(minerAddress, 'task_timeout', taskId);
        }
      }
    }, timeout);
  }

  // Update assignment history for fair distribution
  updateAssignmentHistory(minerAddress) {
    const current = this.assignmentHistory.get(minerAddress) || 0;
    this.assignmentHistory.set(minerAddress, current + 1);
    
    // Decay history over time
    setTimeout(() => {
      const updated = this.assignmentHistory.get(minerAddress) || 0;
      if (updated > 0) {
        this.assignmentHistory.set(minerAddress, updated - 1);
      }
    }, 60000); // 1 minute decay
  }

  // Update average wait time
  updateAvgWaitTime(newWaitTime) {
    const total = this.metrics.totalAssigned;
    this.metrics.avgWaitTime = Math.round(
      (this.metrics.avgWaitTime * (total - 1) + newWaitTime) / total
    );
  }

  // Mark task as completed
  taskCompleted(taskId) {
    this.processing.delete(taskId);
  }

  // Get queue stats
  getStats() {
    return {
      queued: {
        high: this.queues.high.length,
        normal: this.queues.normal.length,
        low: this.queues.low.length,
        total: this.queues.high.length + this.queues.normal.length + this.queues.low.length
      },
      processing: this.processing.size,
      metrics: {
        ...this.metrics,
        assignmentsByMiner: Object.fromEntries(this.assignmentHistory)
      }
    };
  }
}

// Global task queue instance
const taskQueue = new TaskQueue();

// Process queue periodically
setInterval(() => {
  taskQueue.processQueue();
}, 5000);

module.exports = taskQueue;
