/**
 * TaoNet Demo Miner
 * 
 * Simulates miner activity for testing and demos.
 * Uses random AI-like responses.
 */

const WebSocket = require('ws');
const crypto = require('crypto');

const API_URL = process.env.TAONET_API || 'http://localhost:3002';
const WS_URL = process.env.TAONET_WS || 'ws://localhost:3002/ws';

// Demo responses for different task types
const DEMO_RESPONSES = {
  text: [
    "Based on my analysis, the answer involves multiple factors. First, we need to consider the fundamental principles at play. The key insight is that complex systems often emerge from simple rules applied consistently. This creates emergent behaviors that can seem surprising but are actually predictable once you understand the underlying dynamics.",
    "This is a fascinating question that touches on several important concepts. Let me break it down: 1) The core mechanism relies on iterative processes. 2) Each iteration builds upon previous results. 3) Over time, this compounds to create significant outcomes. The practical implications are substantial for anyone working in this field.",
    "From a theoretical standpoint, this can be understood through the lens of information theory. The critical insight is that meaningful patterns emerge from the interaction of structured and random elements. This has applications in everything from natural language processing to complex system design.",
  ],
  code: [
    `function solution(input) {
  // Validate input
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid input');
  }
  
  // Process data
  const result = Object.entries(input)
    .filter(([key, value]) => value !== null)
    .map(([key, value]) => ({
      key,
      processed: processValue(value)
    }));
  
  return result;
}

function processValue(value) {
  return typeof value === 'string' 
    ? value.toUpperCase() 
    : value * 2;
}`,
    `async function fetchAndProcess(urls) {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        const data = await response.json();
        return { url, data, status: 'success' };
      } catch (error) {
        return { url, error: error.message, status: 'error' };
      }
    })
  );
  
  return results.filter(r => r.status === 'success');
}`,
  ],
  trading: [
    {
      sentiment: "bullish",
      confidence: 0.72,
      analysis: "Market indicators show strong accumulation patterns. RSI at 45 suggests room for upward movement. Volume increasing on green candles indicates buyer conviction.",
      signals: ["golden cross forming", "support level holding", "institutional interest rising"],
      recommendation: "Consider gradual position building with stops below recent support."
    },
    {
      sentiment: "neutral",
      confidence: 0.58,
      analysis: "Market in consolidation phase. Mixed signals from technical indicators. Waiting for breakout confirmation before taking directional bias.",
      signals: ["trading in range", "decreasing volatility", "low volume"],
      recommendation: "Wait for clear breakout above resistance or below support before entering."
    },
  ],
  image: [
    "The image appears to contain visual elements that suggest a complex composition. Key features include varied color gradients, geometric patterns, and potential symbolic representations. The overall aesthetic suggests modern design influences.",
    "Analysis of the visual content reveals multiple layers of information. The foreground elements draw attention while background patterns provide context. Color usage creates visual hierarchy effectively.",
  ],
  custom: [
    "Processing complete. The analysis indicates several key factors to consider. Based on the parameters provided, the optimal approach involves balancing multiple competing constraints.",
    "Task completed successfully. Results show strong correlation between input variables. Recommend further analysis for edge cases and boundary conditions.",
  ]
};

class DemoMiner {
  constructor(name) {
    this.name = name;
    this.address = '0x' + crypto.randomBytes(20).toString('hex');
    this.ws = null;
    this.connected = false;
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`[${this.name}] Connecting to ${WS_URL}...`);
      
      this.ws = new WebSocket(WS_URL);
      
      this.ws.on('open', () => {
        console.log(`[${this.name}] Connected, authenticating...`);
        this.authenticate();
      });
      
      this.ws.on('message', (data) => {
        this.handleMessage(JSON.parse(data.toString()));
      });
      
      this.ws.on('close', () => {
        console.log(`[${this.name}] Disconnected`);
        this.connected = false;
        // Reconnect after 5s
        setTimeout(() => this.connect(), 5000);
      });
      
      this.ws.on('error', (error) => {
        console.error(`[${this.name}] Error:`, error.message);
      });
      
      setTimeout(() => {
        if (this.connected) resolve();
        else reject(new Error('Connection timeout'));
      }, 10000);
    });
  }
  
  authenticate() {
    // For demo, we just send a fake signature
    this.ws.send(JSON.stringify({
      type: 'auth',
      address: this.address,
      signature: '0x' + crypto.randomBytes(65).toString('hex')
    }));
  }
  
  handleMessage(data) {
    switch (data.type) {
      case 'auth_success':
        console.log(`[${this.name}] Authenticated! Waiting for tasks...`);
        this.connected = true;
        this.startHeartbeat();
        break;
        
      case 'auth_failed':
        console.error(`[${this.name}] Auth failed:`, data.error);
        break;
        
      case 'new_task':
        this.processTask(data.task);
        break;
        
      case 'task_received':
        console.log(`[${this.name}] Task ${data.taskId} accepted`);
        break;
        
      case 'heartbeat_ack':
        break;
        
      default:
        console.log(`[${this.name}] Unknown:`, data);
    }
  }
  
  startHeartbeat() {
    setInterval(() => {
      if (this.connected && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'heartbeat',
          address: this.address
        }));
      }
    }, 30000);
  }
  
  async processTask(task) {
    console.log(`[${this.name}] Processing task ${task.id} (${task.type})`);
    
    // Simulate processing time
    const processingTime = 1000 + Math.random() * 3000;
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Get random response for task type
    const responses = DEMO_RESPONSES[task.type] || DEMO_RESPONSES.custom;
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    // Submit response
    this.ws.send(JSON.stringify({
      type: 'task_response',
      address: this.address,
      payload: {
        taskId: task.id,
        response: typeof response === 'string' ? { text: response } : response,
        processingTime: Math.round(processingTime)
      }
    }));
    
    console.log(`[${this.name}] Submitted response for task ${task.id}`);
  }
}

// Register demo miners with the API first
async function registerDemoMiner(miner) {
  try {
    const response = await fetch(`${API_URL}/api/miners/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: miner.address,
        signature: '0x' + crypto.randomBytes(65).toString('hex'),
        message: `TaoNet registration: ${miner.address}`,
        name: miner.name,
        hardware: {
          gpu: 'Demo GPU',
          vram: 8,
          modelTypes: ['text', 'code', 'trading', 'image', 'custom']
        }
      })
    });
    
    const data = await response.json();
    console.log(`[${miner.name}] Registered:`, data.success ? 'OK' : data.error);
    return data.success;
  } catch (error) {
    console.error(`[${miner.name}] Registration failed:`, error.message);
    return false;
  }
}

// Main
async function main() {
  const minerCount = parseInt(process.argv[2]) || 3;
  console.log(`Starting ${minerCount} demo miners...`);
  
  const miners = [];
  
  for (let i = 0; i < minerCount; i++) {
    const miner = new DemoMiner(`DemoMiner-${i + 1}`);
    miners.push(miner);
    
    // Register first
    await registerDemoMiner(miner);
    
    // Then connect
    try {
      await miner.connect();
    } catch (error) {
      console.error(`[${miner.name}] Connection failed:`, error.message);
    }
    
    // Stagger connections
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${miners.filter(m => m.connected).length}/${minerCount} miners online\n`);
}

main().catch(console.error);
