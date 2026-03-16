/**
 * TaoNet Miner SDK v2.0
 * Complete SDK for running a TaoNet mining node
 */

class TaoNetMiner {
  constructor(config) {
    this.config = {
      endpoint: config.endpoint || 'http://localhost:3002',
      wallet: config.wallet,
      privateKey: config.privateKey,
      name: config.name || `Miner-${config.wallet?.slice(0, 8)}`,
      capabilities: config.capabilities || ['text'],
      model: config.model || null,
      autoReconnect: config.autoReconnect !== false,
      heartbeatInterval: config.heartbeatInterval || 30000,
      maxConcurrentTasks: config.maxConcurrentTasks || 3,
      ...config
    };
    
    this.ws = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.activeTasks = new Map();
    this.stats = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalRewards: BigInt(0),
      avgResponseTime: 0,
      uptime: 0
    };
    this.startTime = null;
    this.handlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
  }

  // Event handling
  on(event, handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(handler);
    return this;
  }

  emit(event, data) {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Handler error for ${event}:`, error);
      }
    });
  }

  // Connect to the network
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.endpoint.replace('http', 'ws') + '/ws';
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startTime = Date.now();
          this.emit('connected');
          this.authenticate();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
        
        this.ws.onclose = () => {
          this.isConnected = false;
          this.isAuthenticated = false;
          this.emit('disconnected');
          
          if (this.config.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
            this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
            setTimeout(() => this.connect(), delay);
          }
        };
        
        this.ws.onerror = (error) => {
          this.emit('error', error);
          reject(error);
        };
        
        // Resolve when authenticated
        this.on('authenticated', () => resolve(this));
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Authenticate with the network
  authenticate() {
    const timestamp = Date.now();
    const message = `taonet:auth:${this.config.wallet}:${timestamp}`;
    
    // In production, sign with actual private key
    // For demo, use mock signature
    const signature = this.config.privateKey 
      ? this.signMessage(message, this.config.privateKey)
      : `demo_sig_${timestamp}`;
    
    this.send({
      type: 'auth',
      address: this.config.wallet,
      signature,
      timestamp,
      capabilities: this.config.capabilities,
      name: this.config.name
    });
  }

  // Sign message (mock implementation - replace with real crypto)
  signMessage(message, privateKey) {
    // In production, use ethers.js or similar
    // const wallet = new ethers.Wallet(privateKey);
    // return await wallet.signMessage(message);
    return `sig_${Buffer.from(message).toString('base64').slice(0, 32)}`;
  }

  // Handle incoming messages
  handleMessage(message) {
    switch (message.type) {
      case 'auth_success':
        this.isAuthenticated = true;
        this.emit('authenticated', message.miner);
        this.startHeartbeat();
        break;
        
      case 'auth_failed':
        this.emit('auth_failed', message.error);
        break;
        
      case 'task_assigned':
        this.handleTaskAssigned(message.task);
        break;
        
      case 'task_cancelled':
        this.handleTaskCancelled(message.taskId);
        break;
        
      case 'reward':
        this.handleReward(message);
        break;
        
      case 'notification':
        this.emit('notification', message.notification);
        break;
        
      case 'penalty':
        this.emit('penalty', message.penalty);
        break;
        
      case 'network_update':
        this.emit('network_update', message.data);
        break;
        
      case 'pong':
        // Heartbeat response
        break;
        
      default:
        this.emit('message', message);
    }
  }

  // Handle task assignment
  async handleTaskAssigned(task) {
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      this.emit('task_rejected', { taskId: task.id, reason: 'max_concurrent_reached' });
      return;
    }
    
    this.activeTasks.set(task.id, {
      task,
      startTime: Date.now(),
      status: 'processing'
    });
    
    this.emit('task_received', task);
    
    try {
      const startTime = Date.now();
      const result = await this.processTask(task);
      const responseTime = Date.now() - startTime;
      
      this.submitTaskResult(task.id, result, responseTime);
      this.stats.tasksCompleted++;
      this.updateAvgResponseTime(responseTime);
      
      this.emit('task_completed', { taskId: task.id, responseTime, result });
      
    } catch (error) {
      this.stats.tasksFailed++;
      this.emit('task_failed', { taskId: task.id, error: error.message });
      
      this.send({
        type: 'task_failed',
        taskId: task.id,
        error: error.message
      });
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  // Process task with configured model
  async processTask(task) {
    if (!this.config.model) {
      throw new Error('No model configured');
    }
    
    const modelConfig = this.config.model;
    
    switch (modelConfig.type) {
      case 'openai':
        return await this.processWithOpenAI(task, modelConfig);
        
      case 'anthropic':
        return await this.processWithAnthropic(task, modelConfig);
        
      case 'local':
        return await this.processWithLocal(task, modelConfig);
        
      case 'custom':
        return await modelConfig.handler(task);
        
      default:
        throw new Error(`Unknown model type: ${modelConfig.type}`);
    }
  }

  // OpenAI processing
  async processWithOpenAI(task, config) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4',
        messages: [{ role: 'user', content: task.prompt }],
        max_tokens: task.parameters?.maxTokens || 2000,
        temperature: task.parameters?.temperature || 0.7
      })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    return data.choices[0].message.content;
  }

  // Anthropic processing
  async processWithAnthropic(task, config) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model || 'claude-3-sonnet-20240229',
        max_tokens: task.parameters?.maxTokens || 2000,
        messages: [{ role: 'user', content: task.prompt }]
      })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    
    return data.content[0].text;
  }

  // Local model processing (Ollama, LM Studio, etc.)
  async processWithLocal(task, config) {
    const endpoint = config.endpoint || 'http://localhost:11434/api/generate';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model || 'llama2',
        prompt: task.prompt,
        stream: false
      })
    });
    
    const data = await response.json();
    return data.response;
  }

  // Submit task result
  submitTaskResult(taskId, result, responseTime) {
    this.send({
      type: 'task_result',
      taskId,
      result,
      responseTime
    });
  }

  // Handle task cancellation
  handleTaskCancelled(taskId) {
    const taskData = this.activeTasks.get(taskId);
    if (taskData) {
      taskData.status = 'cancelled';
      this.activeTasks.delete(taskId);
      this.emit('task_cancelled', { taskId });
    }
  }

  // Handle reward
  handleReward(message) {
    this.stats.totalRewards += BigInt(message.amount || 0);
    this.emit('reward', {
      amount: message.amount,
      type: message.rewardType,
      taskId: message.taskId,
      total: this.stats.totalRewards.toString()
    });
  }

  // Update average response time
  updateAvgResponseTime(newTime) {
    const total = this.stats.tasksCompleted;
    this.stats.avgResponseTime = Math.round(
      (this.stats.avgResponseTime * (total - 1) + newTime) / total
    );
  }

  // Start heartbeat
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
        this.stats.uptime = Math.floor((Date.now() - this.startTime) / 1000);
      }
    }, this.config.heartbeatInterval);
  }

  // Send message
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Get current stats
  getStats() {
    return {
      ...this.stats,
      totalRewards: this.stats.totalRewards.toString(),
      isConnected: this.isConnected,
      isAuthenticated: this.isAuthenticated,
      activeTasks: this.activeTasks.size,
      successRate: this.stats.tasksCompleted > 0
        ? Math.round(this.stats.tasksCompleted / (this.stats.tasksCompleted + this.stats.tasksFailed) * 100)
        : 0
    };
  }

  // Disconnect
  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.ws) {
      this.config.autoReconnect = false;
      this.ws.close();
    }
  }
}

// CLI Runner
async function runMiner(configPath) {
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  const miner = new TaoNetMiner(config);
  
  miner.on('connected', () => console.log('[TaoNet] Connected to network'));
  miner.on('authenticated', (m) => console.log(`[TaoNet] Authenticated as ${m.name}`));
  miner.on('task_received', (t) => console.log(`[TaoNet] Task received: ${t.id} (${t.type})`));
  miner.on('task_completed', (t) => console.log(`[TaoNet] Task completed: ${t.taskId} in ${t.responseTime}ms`));
  miner.on('task_failed', (t) => console.log(`[TaoNet] Task failed: ${t.taskId} - ${t.error}`));
  miner.on('reward', (r) => console.log(`[TaoNet] Reward: ${r.amount} (${r.type})`));
  miner.on('notification', (n) => console.log(`[TaoNet] ${n.title}: ${n.message}`));
  miner.on('disconnected', () => console.log('[TaoNet] Disconnected'));
  miner.on('reconnecting', (r) => console.log(`[TaoNet] Reconnecting (attempt ${r.attempt})...`));
  miner.on('error', (e) => console.error('[TaoNet] Error:', e));
  
  try {
    await miner.connect();
    console.log('[TaoNet] Mining started. Press Ctrl+C to stop.');
    
    // Stats display interval
    setInterval(() => {
      const stats = miner.getStats();
      console.log(`[Stats] Tasks: ${stats.tasksCompleted} | Failed: ${stats.tasksFailed} | Rewards: ${stats.totalRewards} | Avg Time: ${stats.avgResponseTime}ms`);
    }, 60000);
    
    // Handle shutdown
    process.on('SIGINT', () => {
      console.log('\n[TaoNet] Shutting down...');
      miner.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('[TaoNet] Failed to connect:', error.message);
    process.exit(1);
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TaoNetMiner, runMiner };
}
if (typeof window !== 'undefined') {
  window.TaoNetMiner = TaoNetMiner;
}
