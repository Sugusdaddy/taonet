const express = require('express');
const router = express.Router();
const ApiKey = require('../models/ApiKey');

// Middleware to verify API key
async function apiKeyAuth(requiredPermission) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const apiKey = await ApiKey.verify(authHeader.slice(7));
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    if (apiKey.isRateLimited()) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    if (requiredPermission && !apiKey.hasPermission(requiredPermission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    req.apiKey = apiKey;
    next();
  };
}

// Generate new API key
router.post('/generate', async (req, res) => {
  try {
    const { owner, name, permissions = ['tasks:read', 'stats:read'], ownerType = 'developer' } = req.body;
    
    if (!owner || !name) {
      return res.status(400).json({ error: 'Owner and name required' });
    }
    
    // Limit keys per owner
    const existingKeys = await ApiKey.countDocuments({ owner, status: 'active' });
    if (existingKeys >= 5) {
      return res.status(400).json({ error: 'Maximum 5 active keys per owner' });
    }
    
    const result = await ApiKey.generateKey(owner, name, permissions, ownerType);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({ error: 'Failed to generate key' });
  }
});

// List keys for owner
router.get('/list/:owner', async (req, res) => {
  try {
    const keys = await ApiKey.find({ owner: req.params.owner })
      .select('keyId name permissions status usage.totalRequests usage.lastUsed createdAt')
      .sort({ createdAt: -1 });
    
    res.json({ keys });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list keys' });
  }
});

// Revoke key
router.post('/revoke/:keyId', async (req, res) => {
  try {
    const { owner } = req.body;
    
    const key = await ApiKey.findOneAndUpdate(
      { keyId: req.params.keyId, owner },
      { status: 'revoked' },
      { new: true }
    );
    
    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    res.json({ success: true, message: 'Key revoked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke key' });
  }
});

// Get key usage stats
router.get('/usage/:keyId', async (req, res) => {
  try {
    const key = await ApiKey.findOne({ keyId: req.params.keyId })
      .select('keyId name usage rateLimit status');
    
    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }
    
    res.json({
      keyId: key.keyId,
      name: key.name,
      status: key.status,
      usage: key.usage,
      rateLimit: key.rateLimit,
      remainingToday: key.rateLimit.requestsPerDay - key.usage.requestsToday
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

module.exports = router;
module.exports.apiKeyAuth = apiKeyAuth;
