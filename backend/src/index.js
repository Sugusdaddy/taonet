require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const url = require('url');
const skill = require('./skill');
const { rateLimiter, requestLogger } = require('./middleware');
const { initCronJobs } = require('./cron');

const app = express();
const server = http.createServer(app);

// Global active miners map
global.activeMiners = new Map();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('combined'));
app.use(express.json());
app.use(requestLogger);

// Rate limiting for task submission
app.use('/api/tasks/submit', rateLimiter({ 
  windowMs: 60000, 
  max: 30, 
  message: 'Too many tasks submitted. Please wait.' 
}));

// Routes
const authRoutes = require('./routes/auth');
const minerRoutes = require('./routes/miners');
const taskRoutes = require('./routes/tasks');
const rewardRoutes = require('./routes/rewards');
const statsRoutes = require('./routes/stats');
const validationRoutes = require('./routes/validations');

app.use('/api/auth', authRoutes);
app.use('/api/miners', minerRoutes);
app.use('/api/proofs', require('./routes/proofs'));
app.use('/api/tasks', taskRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/playground', require('./routes/playground'));
app.use('/api/validations', validationRoutes);

// Gamification routes
const gamificationRoutes = require('./routes/gamification');
app.use('/api/game', gamificationRoutes);

// Tournament routes
const tournamentRoutes = require('./routes/tournaments');
app.use('/api/tournaments', tournamentRoutes);

// Notification routes
const notificationRoutes = require('./routes/notifications');
app.use('/api/notifications', notificationRoutes);

// Analytics routes
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);

// API Key routes
const apiKeyRoutes = require('./routes/apiKeys');
app.use('/api/keys', apiKeyRoutes);

// Batch routes
const batchRoutes = require('./routes/batch');
app.use('/api/batch', batchRoutes);

// Token verification routes
const { router: tokenRoutes } = require('./tokenVerification');
app.use('/api/tokens', tokenRoutes);

// Monitoring routes
const monitoringRoutes = require('./routes/monitoring');
const activityRoutes = require('./routes/activity');
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/activity', activityRoutes);

// Skill.md endpoint
app.get('/skill.md', (req, res) => {
  res.type('text/markdown').send(skill);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeMiners: global.activeMiners.size,
    timestamp: new Date().toISOString()
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'TaoNet API',
    version: '1.0.0',
    description: 'Decentralized AI Inference Network',
    endpoints: {
      auth: '/api/auth',
      miners: '/api/miners',
      tasks: '/api/tasks',
      rewards: '/api/rewards',
      stats: '/api/stats',
      validations: '/api/validations'
    },
    websocket: '/ws',
    docs: '/skill.md'
  });
});

// WebSocket setup
global.wss = new WebSocketServer({ noServer: true });

// Handle HTTP upgrade
server.on('upgrade', (request, socket, head) => {
  const { pathname } = url.parse(request.url);
  
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// WebSocket connection handler
const { MinerController } = require('./controllers/minerController');

global.wss.on('connection', (ws, request) => {
  console.log('New WebSocket connection');
  
  ws.isAlive = true;
  ws.minerAddress = null;
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { handleWebSocketMessage } = require("./wsHandler"); await handleWebSocketMessage(ws, message);
      
      // Store miner address for cleanup
      if (message.type === 'auth' && message.address) {
        ws.minerAddress = message.address.toLowerCase();
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });
  
  ws.on('close', async () => {
    console.log('WebSocket connection closed');
    
    // Remove from active miners
    if (ws.minerAddress) {
      global.activeMiners.delete(ws.minerAddress);
      
      // Update miner status
      const Miner = require('./models/Miner');
      await Miner.updateOne(
        { address: ws.minerAddress },
        { status: 'offline', lastSeen: new Date() }
      );
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Heartbeat check - terminate dead connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      if (ws.minerAddress) {
        global.activeMiners.delete(ws.minerAddress);
      }
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

global.wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Task cleanup - expire old pending tasks
const Task = require('./models/Task');

setInterval(async () => {
  try {
    const expiredTasks = await Task.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() }
      },
      {
        status: 'expired'
      }
    );
    
    if (expiredTasks.modifiedCount > 0) {
      console.log(`Expired ${expiredTasks.modifiedCount} tasks`);
    }
  } catch (error) {
    console.error('Task cleanup error:', error);
  }
}, 60000); // Every minute

// Task assignment queue processor
const { TaskController } = require('./controllers/taskController');

setInterval(async () => {
  try {
    // Find unassigned pending tasks
    const pendingTasks = await Task.find({
      status: 'pending',
      assignedMiner: null,
      expiresAt: { $gt: new Date() }
    }).sort({ priority: -1, createdAt: 1 }).limit(10);
    
    for (const task of pendingTasks) {
      await TaskController.assignTask(task);
    }
  } catch (error) {
    console.error('Task assignment error:', error);
  }
}, 5000); // Every 5 seconds

// Auto-validation for completed responses
const { ValidationController } = require('./controllers/validationController');

setInterval(async () => {
  try {
    // Find tasks with responses but not completed
    const tasksNeedingValidation = await Task.find({
      status: 'assigned',
      'responses.0': { $exists: true },
      completedAt: null
    }).limit(5);
    
    for (const task of tasksNeedingValidation) {
      // Check if all responses have been validated
      const hasUnvalidated = task.responses.some(r => r.score === undefined || r.score === null);
      
      if (hasUnvalidated) {
        // Auto-validate for demo purposes
        await ValidationController.autoValidate(task._id);
        console.log(`Auto-validated task ${task._id}`);
      }
    }
  } catch (error) {
    console.error('Auto-validation error:', error);
  }
}, 10000); // Every 10 seconds

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taonet';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Initialize cron jobs after DB connection
    initCronJobs();
    // Start automatic task generation
    const taskGenerator = require("./taskGenerator");
    taskGenerator.start(3000);
    console.log("Task generator started");

// Initialize Solana anchor
const solanaAnchor = require('./services/solanaAnchor');
solanaAnchor.init(process.env.SOLANA_PRIVATE_KEY);
console.log('[Anchor] Service initialized');
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`TaoNet server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  
  global.wss.close(() => {
    server.close(() => {
      mongoose.connection.close(false, () => {
        process.exit(0);
      });
    });
  });
});

module.exports = { app, server, wss };
