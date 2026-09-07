const rateLimit = require("express-rate-limit");

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const max = parseInt(process.env.RATE_LIMIT_MAX || "60", 10);

// Keeps a single Render free-tier instance from getting hammered and protects
// upstream Jikan (which has its own strict public rate limit ~60 req/min).
const apiLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests, please slow down and try again shortly.",
  },
});

module.exports = { apiLimiter };
