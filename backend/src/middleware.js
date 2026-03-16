const rateLimit = new Map();

// Simple in-memory rate limiter
function rateLimiter(options = {}) {
  const {
    windowMs = 60000,  // 1 minute
    max = 100,         // max requests per window
    message = 'Too many requests, please try again later'
  } = options;
  
  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    
    if (!rateLimit.has(key)) {
      rateLimit.set(key, { count: 1, start: now });
      return next();
    }
    
    const record = rateLimit.get(key);
    
    // Reset if window expired
    if (now - record.start > windowMs) {
      rateLimit.set(key, { count: 1, start: now });
      return next();
    }
    
    // Check limit
    if (record.count >= max) {
      return res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil((record.start + windowMs - now) / 1000)
      });
    }
    
    // Increment
    record.count++;
    next();
  };
}

// API Key validation (optional)
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  // Skip auth for public endpoints
  const publicPaths = ['/health', '/api/stats', '/skill.md', '/api'];
  if (publicPaths.some(p => req.path.startsWith(p))) {
    return next();
  }
  
  // Skip if no API keys configured
  if (!process.env.API_KEYS) {
    return next();
  }
  
  const validKeys = process.env.API_KEYS.split(',').map(k => k.trim());
  
  if (!apiKey || !validKeys.includes(apiKey)) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  
  next();
}

// Request logging middleware
function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.headers['x-forwarded-for'],
      timestamp: new Date().toISOString()
    };
    
    // Only log errors or slow requests in production
    if (res.statusCode >= 400 || duration > 1000) {
      console.log(JSON.stringify(log));
    }
  });
  
  next();
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 60000;
  
  for (const [key, record] of rateLimit) {
    if (now - record.start > windowMs * 2) {
      rateLimit.delete(key);
    }
  }
}, 60000);

module.exports = { rateLimiter, apiKeyAuth, requestLogger };
