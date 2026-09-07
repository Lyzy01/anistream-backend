# AniStream — Project Setup & Deployment Guide

Two folders:

- `anistream-backend/` — Express API (Jikan metadata proxy), deployed to Render.
- `anistream-app/` — Expo Router (TypeScript) mobile app.

Scope note: this backend proxies **MyAnimeList metadata via the public Jikan
API only**. It does not include a video-scraping/streaming proxy — the
player screen expects a `source` URL for video you have the rights to serve
(your own uploads, a licensed partner API, etc.).

---

## 1. Backend — push to GitHub

```bash
cd anistream-backend
git init
git add .
git commit -m "Initial AniStream backend"
gh repo create anistream-backend --public --source=. --remote=origin --push
# or manually: create a repo on GitHub, then
#   git remote add origin https://github.com/<you>/anistream-backend.git
#   git branch -M main
#   git push -u origin main
```

Copy `.env.example` to `.env` locally and fill in values for local dev:

```bash
cp .env.example .env
npm install
npm run dev   # nodemon, http://localhost:8080/health
```

## 2. Deploy the backend to Render

**Option A — Blueprint (recommended, uses `render.yaml`):**

1. Go to the [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Connect your GitHub account and select the `anistream-backend` repo.
3. Render reads `render.yaml` and provisions the web service automatically.
4. In the service's **Environment** tab, add the Firebase Admin secrets (don't
   put these in `render.yaml` since it's committed to git):
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY` (paste the full key; Render preserves newlines fine
     if you paste it directly — the code also handles escaped `\n`)
5. Click **Apply** — Render builds and deploys. Your API will be live at
   `https://anistream-backend.onrender.com` (or whatever name you chose).

**Option B — Manual Web Service:**

1. **New** → **Web Service** → connect the `anistream-backend` repo.
2. Runtime: `Node`. Build command: `npm install`. Start command: `npm start`.
3. Instance type: **Free**.
4. Add the env vars listed in `.env.example` under the service's **Environment** tab.
5. Set **Health Check Path** to `/health`.
6. Deploy.

### Free-tier cold starts

Render's free web services spin down after ~15 minutes of inactivity and take
~30-60s to wake on the next request. Two mitigations already built in:

- The Expo API client (`lib/api.ts`) auto-retries once after a short delay on
  a 502/503 cold-start response.
- You can ping `GET /health` every ~10 minutes with a free service like
  [UptimeRobot](https://uptimerobot.com) or [cron-job.org](https://cron-job.org)
  to keep the instance warmer during active hours (note: this uses up your
  free-tier monthly hours faster).

### Verify it's live

```bash
curl https://anistream-backend.onrender.com/health
curl "https://anistream-backend.onrender.com/api/anime/search?q=naruto"
```

---

## 3. Firebase setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → enable **Email/Password** (add others as needed).
3. **Firestore Database** → Create database → start in production mode.
4. Apply the security rules shown at the bottom of `anistream-app/firebase.ts`.
5. **Project Settings** → General → "Your apps" → add a **Web app** → copy the
   config values into `anistream-app/.env` (see `.env.example`).
6. **Project Settings** → Service Accounts → Generate new private key → use
   those three values for the backend's `FIREBASE_*` env vars on Render
   (only needed if you use the optional server-side `/api/user/progress` routes).

---

## 4. Frontend — run the Expo app

```bash
cd anistream-app
cp .env.example .env   # fill in Firebase config + your Render URL
npm install
npx expo start
```

Scan the QR code with Expo Go (SDK 51) on your phone, or press `i` / `a` for
a simulator/emulator.

### Push to GitHub

```bash
git init
git add .
git commit -m "Initial AniStream Expo app"
gh repo create anistream-app --public --source=. --remote=origin --push
```

### Building for real devices / stores

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios
eas build --platform android
```

---

## Project structure

```
anistream-backend/
├── server.js
├── render.yaml
├── package.json
├── .env.example
├── middleware/
│   ├── auth.js          # Firebase ID token verification
│   ├── cache.js          # node-cache response caching
│   └── rateLimit.js      # express-rate-limit config
└── routes/
    ├── jikan.js           # search / trending / seasonal / details / episodes
    └── user.js            # optional server-side progress sync (Firestore Admin)

anistream-app/
├── app/
│   ├── _layout.tsx                # root stack + AuthProvider
│   ├── (tabs)/
│   │   ├── _layout.tsx            # bottom tab bar
│   │   ├── index.tsx              # Home: trending + seasonal carousels
│   │   ├── search.tsx
│   │   ├── watchlist.tsx
│   │   └── profile.tsx            # Firebase email/password auth
│   ├── anime/[id].tsx             # details + episode list
│   └── player/[id].tsx            # HLS video player + progress sync
├── components/AnimeCard.tsx
├── lib/
│   ├── api.ts                     # typed client for the Render backend
│   └── AuthContext.tsx
├── firebase.ts                    # Firebase init + Firestore helpers
├── app.config.ts
└── .env.example
```
