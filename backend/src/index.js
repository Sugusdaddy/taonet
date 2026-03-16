require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { WebSocketServer } = require('ws');
const morgan = require('morgan');

// Routes
const minerRoutes = require('./routes/miners');
const taskRoutes = require('./routes/tasks');
const proofRoutes = require('./routes/proofs');
const rewardRoutes = require('./routes/rewards');
const statsRoutes = require('./routes/stats');
const gamificationRoutes = require('./routes/gamification');
const tournamentRoutes = require('./routes/tournaments');
const airdropRoutes = require('./routes/airdrops');
const playgroundRoutes = require('./routes/playground');

// Services
const { setupWebSocket } = require('./wsHandler');
const airdropService = require('./services/airdropService');
const cron = require('./services/cron');

const app = express();
const server = http.createServer(app);

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Middleware
app.use(cors({
  origin: ['https://taonet.fun', 'https://www.taonet.fun', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// API Routes
app.use('/api/miners', minerRoutes);
app.use('/api/chat', require('./routes/chat'));
app.use('/api/tasks', taskRoutes);
app.use('/api/proofs', proofRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/airdrops', airdropRoutes);
app.use('/api/playground', playgroundRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taonet';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Init cron jobs
    console.log('Initializing cron jobs...');
    cron.initCronJobs();
    console.log('Cron jobs initialized');
    
    // Init airdrop service
    await airdropService.initialize();
    airdropService.startProcessing();
    console.log('[Airdrop] Initialized:', airdropService.initialized);
    
    server.listen(PORT, () => {
      console.log(`TaoNet server running on port ${PORT}`);
      console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = { app, server, wss };
