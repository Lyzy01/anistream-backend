const NodeCache = require("node-cache");

const ttl = parseInt(process.env.CACHE_TTL_SECONDS || "600", 10);

// stdTTL applies to every key unless overridden; checkperiod sweeps expired keys
const cache = new NodeCache({ stdTTL: ttl, checkperiod: 120, useClones: false });

/**
 * Express middleware that caches JSON responses by request URL.
 * On Render's free tier the instance spins down after inactivity, so this cache
 * only helps *within* a warm instance's lifetime — it resets on every cold start.
 */
function cacheMiddleware(prefix = "") {
  return (req, res, next) => {
    const key = `${prefix}:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      res.set("X-Cache", "HIT");
      return res.json(cached);
    }

    // Monkey-patch res.json to capture the payload before sending it
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body);
      }
      res.set("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
}

module.exports = { cache, cacheMiddleware };
