const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');

// Get recent activity
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.json({
      activities: activities.map(a => ({
        type: a.type,
        miner: a.miner?.name || 'Anonymous',
        address: a.miner?.address ? a.miner.address.substring(0, 8) + '...' : null,
        data: a.data,
        time: a.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// Helper to log activity (called from other controllers)
router.logActivity = async function(type, miner, data = {}) {
  try {
    const activity = new Activity({
      type,
      miner: miner ? { address: miner.address, name: miner.name } : null,
      data
    });
    await activity.save();
    
    // Broadcast via WebSocket
    if (global.wss) {
      const msg = JSON.stringify({
        type: 'activity',
        activity: {
          type,
          miner: miner?.name || 'Anonymous',
          data,
          time: new Date()
        }
      });
      global.wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(msg);
      });
    }
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
};

module.exports = router;
