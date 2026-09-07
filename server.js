require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const { apiLimiter } = require("./middleware/rateLimit");
const { initFirebaseAdmin } = require("./middleware/auth");
const jikanRoutes = require("./routes/jikan");
const userRoutes = require("./routes/user");

const app = express();

// Render sets PORT dynamically — never hardcode it.
const PORT = process.env.PORT || 8080;

// --- Core middleware ---------------------------------------------------
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// --- CORS ----------------------------------------------------------------
// Expo apps call this from exp://, native builds, and web preview — all
// different origins. CORS_ORIGINS is a comma-separated allowlist; "*" allows
// any origin (fine for a public read-only metadata API, tighten if you add
// user-write endpoints without token auth).
const allowedOrigins = (process.env.CORS_ORIGINS || "*").split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Apply rate limiting to all /api routes only (health check stays unthrottled
// so Render's own health probes and uptime pingers never get blocked).
app.use("/api", apiLimiter);

// --- Health check ----------------------------------------------------------
// Render polls this for the web service health check, and you can also hit it
// from a free uptime pinger (e.g. UptimeRobot / cron-job.org) every ~10 min to
// reduce free-tier spin-down cold starts.
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({ service: "anistream-backend", status: "running" });
});

// --- Routes ------------------------------------------------------------
app.use("/api/anime", jikanRoutes);
app.use("/api/user", userRoutes);

// --- 404 + error handling -----------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

initFirebaseAdmin();

app.listen(PORT, () => {
  console.log(`AniStream backend listening on port ${PORT}`);
});
