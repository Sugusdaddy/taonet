/**
 * Enhanced Rate Limiting by Tier
 * Different limits for different staking tiers
 */

const rateLimit = require('express-rate-limit');
const Miner = require('./models/Miner');

// Rate limits by tier (requests per minute)
const TIER_LIMITS = {
  anonymous: { rpm: 10, daily: 100 },
  bronze: { rpm: 30, daily: 1000 },
  silver: { rpm: 60, daily: 5000 },
  gold: { rpm: 120, daily: 20000 },
  platinum: { rpm: 300, daily: 100000 },
  diamond: { rpm: 600, daily: 500000 }
};

// In-memory store for rate limiting
const requestCounts = new Map();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  requestCounts.forEach((data, key) => {
    if (now - data.lastReset > 24 * 60 * 60 * 1000) {
      requestCounts.delete(key);
    }
  });
}, 60 * 60 * 1000);

// Get tier from request
async function getTier(req) {
  // Check for API key
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const ApiKey = require('./models/ApiKey');
    const key = await ApiKey.verify(authHeader.slice(7));
    if (key) {
      // Get owner's tier
      const miner = await Miner.findOne({ address: key.owner });
      return miner?.stakingTier || 'bronze';
    }
  }
  
  // Check for miner address in query/body
  const address = req.query.address || req.body?.address || req.params?.address;
  if (address) {
    const miner = await Miner.findOne({ address });
    return miner?.stakingTier || 'bronze';
  }
  
  return 'anonymous';
}

// Tiered rate limiter middleware
function tieredRateLimiter() {
  return async (req, res, next) => {
    try {
      const tier = await getTier(req);
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.anonymous;
      
      const key = req.ip + ':' + tier;
      const now = Date.now();
      const minute = Math.floor(now / 60000);
      const day = Math.floor(now / (24 * 60 * 60 * 1000));
      
      let data = requestCounts.get(key);
      
      if (!data || data.minute !== minute) {
        data = {
          minute,
          day,
          rpm: 0,
          daily: data?.day === day ? data.daily : 0,
          lastReset: now
        };
      }
      
      // Reset daily if new day
      if (data.day !== day) {
        data.day = day;
        data.daily = 0;
      }
      
      data.rpm++;
      data.daily++;
      requestCounts.set(key, data);
      
      // Add headers
      res.setHeader('X-RateLimit-Tier', tier);
      res.setHeader('X-RateLimit-Limit-RPM', limits.rpm);
      res.setHeader('X-RateLimit-Remaining-RPM', Math.max(0, limits.rpm - data.rpm));
      res.setHeader('X-RateLimit-Limit-Daily', limits.daily);
      res.setHeader('X-RateLimit-Remaining-Daily', Math.max(0, limits.daily - data.daily));
      
      // Check limits
      if (data.rpm > limits.rpm) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          tier,
          limit: limits.rpm,
          retryAfter: 60 - (now % 60000) / 1000,
          upgrade: tier !== 'diamond' ? 'Upgrade tier for higher limits' : null
        });
      }
      
      if (data.daily > limits.daily) {
        return res.status(429).json({
          error: 'Daily limit exceeded',
          tier,
          limit: limits.daily,
          retryAfter: 24 * 60 * 60 - (now % (24 * 60 * 60 * 1000)) / 1000,
          upgrade: tier !== 'diamond' ? 'Upgrade tier for higher limits' : null
        });
      }
      
      next();
    } catch (error) {
      // On error, allow request but log
      console.error('Rate limiter error:', error);
      next();
    }
  };
}

// Strict limiter for sensitive endpoints
function strictRateLimiter(maxPerMinute = 5) {
  return rateLimit({
    windowMs: 60 * 1000,
    max: maxPerMinute,
    message: { error: 'Too many requests, try again later' }
  });
}

// Get current limits for address
async function getLimitsForAddress(address) {
  const miner = await Miner.findOne({ address });
  const tier = miner?.stakingTier || 'bronze';
  const limits = TIER_LIMITS[tier];
  
  const key = 'check:' + address;
  const data = requestCounts.get(key) || { rpm: 0, daily: 0 };
  
  return {
    tier,
    limits,
    usage: {
      rpm: data.rpm,
      daily: data.daily
    },
    remaining: {
      rpm: Math.max(0, limits.rpm - data.rpm),
      daily: Math.max(0, limits.daily - data.daily)
    }
  };
}

module.exports = {
  tieredRateLimiter,
  strictRateLimiter,
  getLimitsForAddress,
  TIER_LIMITS
};
