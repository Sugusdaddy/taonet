#!/usr/bin/env node
/**
 * TaoNet Autonomous Miner
 * Connects to TaoNet and processes AI inference tasks
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Load config
const configPath = path.join(__dirname, '..', 'config.json');
let config = {
  apiUrl: 'http://204.168.139.31',
  wsUrl: 'ws://204.168.139.31/ws',
  capabilities: ['text', 'code'],
  maxConcurrentTasks: 2,
  autoMine: true
};

if (fs.existsSync(configPath)) {
  config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
}

// Parse CLI args
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--address' || args[i] === '-a') config.address = args[++i];
}

if (!config.address) {
  console.log('Error: Address required. Use --address <wallet> or set in config.json');
  process.exit(1);
}

// Stats
const stats = {
  connected: false,
  tasksReceived: 0,
  tasksCompleted: 0,
  tasksFailed: 0,
  totalRewards: 0,
  startTime: Date.now()
};

// Model providers
async function callModel(prompt, taskType) {
  const modelConfig = config.model || {};
  const provider = modelConfig.provider || 'demo';
  
  switch (provider) {
    case 'openai':
      return await callOpenAI(prompt, modelConfig);
    case 'anthropic':
      return await callAnthropic(prompt, modelConfig);
    case 'ollama':
      return await callOllama(prompt, modelConfig);
    case 'openrouter':
      return await callOpenRouter(prompt, modelConfig);
    default:
      // Demo mode - generate placeholder response
      return generateDemoResponse(prompt, taskType);
  }
}

async function callOpenAI(prompt, config) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Error generating response';
}

async function callAnthropic(prompt, config) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-opus-20240229',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  return data.content?.[0]?.text || 'Error generating response';
}

async function callOllama(prompt, config) {
  const response = await fetch(`${config.baseUrl || 'http://localhost:11434'}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model || 'llama2',
      prompt: prompt,
      stream: false
    })
  });
  const data = await response.json();
  return data.response || 'Error generating response';
}

async function callOpenRouter(prompt, config) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Error generating response';
}

function generateDemoResponse(prompt, taskType) {
  // Demo responses for testing without API
  const responses = {
    text: `This is a demo response to: "${prompt.slice(0, 50)}..."`,
    code: `// Demo code response\nfunction solution() {\n  // Implementation for: ${prompt.slice(0, 30)}\n  return "result";\n}`,
    image: 'Demo: Image generation not available in demo mode',
    trading: '{"signal": "hold", "confidence": 0.5, "reason": "Demo mode"}'
  };
  return responses[taskType] || responses.text;
}

// WebSocket connection
let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;

function connect() {
  console.log(`[${timestamp()}] Connecting to ${config.wsUrl}...`);
  
  ws = new WebSocket(`${config.wsUrl}?address=${config.address}&capabilities=${config.capabilities.join(',')}`);
  
  ws.on('open', () => {
    console.log(`[${timestamp()}] Connected to TaoNet`);
    stats.connected = true;
    reconnectAttempts = 0;
    
    // Send ping every 30s
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  });
  
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      await handleMessage(msg);
    } catch (error) {
      console.error(`[${timestamp()}] Parse error:`, error.message);
    }
  });
  
  ws.on('close', () => {
    console.log(`[${timestamp()}] Disconnected`);
    stats.connected = false;
    scheduleReconnect();
  });
  
  ws.on('error', (error) => {
    console.error(`[${timestamp()}] WebSocket error:`, error.message);
  });
}

function scheduleReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.log(`[${timestamp()}] Max reconnect attempts reached. Exiting.`);
    process.exit(1);
  }
  
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 60000);
  reconnectAttempts++;
  
  console.log(`[${timestamp()}] Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
  setTimeout(connect, delay);
}

async function handleMessage(msg) {
  switch (msg.type) {
    case 'task_assigned':
      await processTask(msg.task);
      break;
      
    case 'reward':
      stats.totalRewards += msg.amount || 0;
      console.log(`[${timestamp()}] Reward received: +${msg.amount} tokens (Total: ${stats.totalRewards})`);
      break;
      
    case 'notification':
      console.log(`[${timestamp()}] ${msg.title}: ${msg.message}`);
      break;
      
    case 'pong':
      // Heartbeat acknowledged
      break;
      
    case 'error':
      console.error(`[${timestamp()}] Server error:`, msg.message);
      break;
  }
}

async function processTask(task) {
  stats.tasksReceived++;
  console.log(`[${timestamp()}] Task received: ${task.id} (${task.type})`);
  console.log(`  Prompt: ${task.prompt?.slice(0, 50)}...`);
  
  const startTime = Date.now();
  
  try {
    // Generate response using model
    const result = await callModel(task.prompt, task.type);
    const processingTime = Date.now() - startTime;
    
    // Submit result
    const response = await fetch(`${config.apiUrl}/api/tasks/${task.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minerAddress: config.address,
        result,
        processingTime
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      stats.tasksCompleted++;
      console.log(`[${timestamp()}] Task ${task.id} completed in ${processingTime}ms`);
    } else {
      stats.tasksFailed++;
      console.log(`[${timestamp()}] Task ${task.id} submission failed:`, data.error);
    }
    
  } catch (error) {
    stats.tasksFailed++;
    console.error(`[${timestamp()}] Task ${task.id} failed:`, error.message);
  }
}

function timestamp() {
  return new Date().toISOString().slice(11, 19);
}

function printStats() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  
  console.log('');
  console.log('='.repeat(50));
  console.log('MINING STATS');
  console.log('='.repeat(50));
  console.log(`Status: ${stats.connected ? 'ONLINE' : 'OFFLINE'}`);
  console.log(`Uptime: ${hours}h ${mins}m`);
  console.log(`Tasks: ${stats.tasksCompleted}/${stats.tasksReceived} completed (${stats.tasksFailed} failed)`);
  console.log(`Rewards: ${stats.totalRewards} tokens`);
  console.log('='.repeat(50));
  console.log('');
}

// Main
console.log('='.repeat(50));
console.log('TAONET AUTONOMOUS MINER');
console.log('='.repeat(50));
console.log(`Address: ${config.address}`);
console.log(`Capabilities: ${config.capabilities.join(', ')}`);
console.log(`Model: ${config.model?.provider || 'demo'}`);
console.log('='.repeat(50));
console.log('');

// Print stats every 5 minutes
setInterval(printStats, 300000);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('');
  printStats();
  console.log('Shutting down...');
  if (ws) ws.close();
  process.exit(0);
});

// Start mining
connect();
