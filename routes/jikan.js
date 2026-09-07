const express = require("express");
const axios = require("axios");
const { cacheMiddleware } = require("../middleware/cache");

const router = express.Router();

const JIKAN_BASE_URL = process.env.JIKAN_BASE_URL || "https://api.jikan.moe/v4";

const jikan = axios.create({
  baseURL: JIKAN_BASE_URL,
  timeout: 10000,
});

// Small helper so every route shares the same error shape
async function proxyGet(path, params, res) {
  try {
    const { data } = await jikan.get(path, { params });
    return res.json(data);
  } catch (err) {
    const status = err.response?.status || 502;
    const message =
      err.response?.data?.message || "Failed to reach Jikan API. It may be rate-limiting us.";
    return res.status(status).json({ error: message });
  }
}

/**
 * GET /api/anime/search?q=naruto&page=1&limit=20
 */
router.get("/search", cacheMiddleware("jikan-search"), (req, res) => {
  const { q, page = 1, limit = 20, genres, status, type } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: "Query param 'q' is required" });
  }

  return proxyGet(
    "/anime",
    { q, page, limit, genres, status, type, sfw: true },
    res
  );
});

/**
 * GET /api/anime/trending?page=1
 * Uses Jikan's "top" endpoint filtered to currently airing for a trending feel.
 */
router.get("/trending", cacheMiddleware("jikan-trending"), (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  return proxyGet("/top/anime", { page, limit, filter: "airing" }, res);
});

/**
 * GET /api/anime/seasonal?year=2026&season=fall
 * Falls back to the current season if year/season are omitted.
 */
router.get("/seasonal", cacheMiddleware("jikan-seasonal"), (req, res) => {
  const { year, season, page = 1, limit = 20 } = req.query;

  const path = year && season ? `/seasons/${year}/${season}` : "/seasons/now";
  return proxyGet(path, { page, limit }, res);
});

/**
 * GET /api/anime/:id
 * Full anime details.
 */
router.get("/:id", cacheMiddleware("jikan-details"), (req, res) => {
  const { id } = req.params;
  return proxyGet(`/anime/${id}/full`, {}, res);
});

/**
 * GET /api/anime/:id/episodes?page=1
 */
router.get("/:id/episodes", cacheMiddleware("jikan-episodes"), (req, res) => {
  const { id } = req.params;
  const { page = 1 } = req.query;
  return proxyGet(`/anime/${id}/episodes`, { page }, res);
});

/**
 * GET /api/anime/:id/characters
 */
router.get("/:id/characters", cacheMiddleware("jikan-characters"), (req, res) => {
  const { id } = req.params;
  return proxyGet(`/anime/${id}/characters`, {}, res);
});

/**
 * GET /api/anime/:id/recommendations
 */
router.get("/:id/recommendations", cacheMiddleware("jikan-recs"), (req, res) => {
  const { id } = req.params;
  return proxyGet(`/anime/${id}/recommendations`, {}, res);
});

module.exports = router;
