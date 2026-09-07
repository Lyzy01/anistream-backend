const express = require("express");
const admin = require("firebase-admin");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * NOTE: For most watchlist/favorites/progress operations, it's simpler and cheaper
 * to write directly from the Expo app to Firestore using the client SDK + security
 * rules (see firebase.ts in the app project) — that avoids round-tripping through
 * this backend entirely and works fine offline-first.
 *
 * These routes exist for cases where you want server-side validation or aggregation
 * (e.g. a "resume watching" endpoint that merges progress with fresh Jikan metadata).
 */

router.get("/progress/:animeId", requireAuth, async (req, res) => {
  try {
    const db = admin.firestore();
    const doc = await db
      .collection("users")
      .doc(req.user.uid)
      .collection("progress")
      .doc(req.params.animeId)
      .get();

    if (!doc.exists) {
      return res.status(404).json({ error: "No progress found" });
    }
    return res.json(doc.data());
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch progress" });
  }
});

router.put("/progress/:animeId", requireAuth, async (req, res) => {
  const { episodeNumber, positionSeconds, durationSeconds } = req.body;

  if (typeof episodeNumber !== "number" || typeof positionSeconds !== "number") {
    return res.status(400).json({ error: "episodeNumber and positionSeconds are required numbers" });
  }

  try {
    const db = admin.firestore();
    await db
      .collection("users")
      .doc(req.user.uid)
      .collection("progress")
      .doc(req.params.animeId)
      .set(
        {
          episodeNumber,
          positionSeconds,
          durationSeconds: durationSeconds || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save progress" });
  }
});

module.exports = router;
