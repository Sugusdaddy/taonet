const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  // Key identifier (public)
  keyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Hashed secret (never store plain)
  secretHash: {
    type: String,
    required: true
  },
  
  // Owner
  owner: {
    type: String,
    required: true,
    index: true
  },
  ownerType: {
    type: String,
    enum: ['miner', 'developer', 'admin'],
    default: 'developer'
  },
  
  // Key name/label
  name: {
    type: String,
    required: true
  },
  
  // Permissions
  permissions: [{
    type: String,
    enum: ['tasks:read', 'tasks:write', 'miners:read', 'stats:read', 'rewards:read', 'admin:*']
  }],
  
  // Rate limits
  rateLimit: {
    requestsPerMinute: { type: Number, default: 60 },
    requestsPerDay: { type: Number, default: 10000 }
  },
  
  // Usage tracking
  usage: {
    totalRequests: { type: Number, default: 0 },
    lastUsed: Date,
    requestsToday: { type: Number, default: 0 },
    lastResetDate: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked'],
    default: 'active'
  },
  
  // Expiration
  expiresAt: Date,
  
  // Metadata
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Generate new API key
apiKeySchema.statics.generateKey = async function(owner, name, permissions, ownerType = 'developer') {
  const keyId = `tao_${crypto.randomBytes(8).toString('hex')}`;
  const secret = crypto.randomBytes(32).toString('hex');
  const secretHash = crypto.createHash('sha256').update(secret).digest('hex');
  
  const apiKey = new this({
    keyId,
    secretHash,
    owner,
    ownerType,
    name,
    permissions
  });
  
  await apiKey.save();
  
  // Return the plain secret only once
  return {
    keyId,
    secret: `${keyId}.${secret}`,
    name,
    permissions,
    warning: 'Store this secret securely. It cannot be retrieved again.'
  };
};

// Verify API key
apiKeySchema.statics.verify = async function(fullKey) {
  try {
    const [keyId, secret] = fullKey.split('.');
    if (!keyId || !secret) return null;
    
    const apiKey = await this.findOne({ keyId, status: 'active' });
    if (!apiKey) return null;
    
    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }
    
    // Verify secret
    const secretHash = crypto.createHash('sha256').update(secret).digest('hex');
    if (secretHash !== apiKey.secretHash) return null;
    
    // Update usage
    const now = new Date();
    const today = now.toDateString();
    
    if (!apiKey.usage.lastResetDate || apiKey.usage.lastResetDate.toDateString() !== today) {
      apiKey.usage.requestsToday = 0;
      apiKey.usage.lastResetDate = now;
    }
    
    apiKey.usage.totalRequests++;
    apiKey.usage.requestsToday++;
    apiKey.usage.lastUsed = now;
    await apiKey.save();
    
    return apiKey;
  } catch (error) {
    console.error('API key verification error:', error);
    return null;
  }
};

// Check permission
apiKeySchema.methods.hasPermission = function(permission) {
  if (this.permissions.includes('admin:*')) return true;
  return this.permissions.includes(permission);
};

// Check rate limit
apiKeySchema.methods.isRateLimited = function() {
  return this.usage.requestsToday >= this.rateLimit.requestsPerDay;
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
