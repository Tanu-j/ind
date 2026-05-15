# WhiteIndexWay

Instant Google URL indexing platform — paste URLs, spend credits, get live Google Indexing API status.

## Features

- **Google Instant mode (default)** — 100% Google Indexing API + IndexNow + discovery pings per URL
- **Credit packages** — buy credits in-dashboard (`ALLOW_DEMO_CREDITS=true` for testing)
- **Platform GCP key** — optional `PLATFORM_GCP_SERVICE_ACCOUNT_JSON` so users only paste URLs (like commercial indexers)
- **Live status** — SUBMITTED → INDEXED with Google metadata verification
- **Hybrid / Maximum modes** — crawl-trap RSS + multi-signal indexing
- **MongoDB job queue** — parallel processing, auto-runs after submit

## Quick start

### 1. Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- `MONGODB_URI` — MongoDB connection string
- `AUTH_SECRET` — at least 32 random characters
- `APP_URL` — public URL of this app (e.g. `http://localhost:3000`) for crawl-trap RSS feed
- `WORKER_SECRET` — required in production for `POST /api/worker/process`

### 2. Install & run

```bash
npm install
npm run seed    # creates seed domain pointing at APP_URL/feeds/live-index.xml
npm run dev     # http://localhost:3000
npm test        # unit tests
```

**Development:** URL batches process automatically when you submit (no separate worker needed).

**Optional** — continuous queue polling (retries, large backlogs):

```bash
npm run worker       # standalone worker
npm run dev:all      # dev server + worker together
```

If the dev server acts oddly (missing API routes), run `npm run dev:clean` to reset the Turbopack cache.

### 3. Google Indexing API (optional)

1. Create a GCP project and enable **Indexing API**
2. Create a service account and download JSON key
3. Add the service account as **Owner** in Google Search Console for your site
4. In the app: **Dashboard → Settings** → paste JSON and property URL

Use only for pages with `JobPosting` or `BroadcastEvent` schema per [Google's guidelines](https://developers.google.com/search/apis/indexing-api/v3/using-api).

## Project structure

```
app/
  api/          # REST API (auth, submit, batches, credentials, worker)
  dashboard/    # Protected UI
  (auth)/       # Login & register
components/     # UI + layout
lib/
  services/     # Indexing API, IndexNow, crawl trap, batch processor
  auth/         # Session JWT
models/         # Mongoose schemas
workers/        # Background queue processor
scripts/        # DB seed
```

## API overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login` | POST | Sign in |
| `/api/index/submit` | POST | Submit URL batch |
| `/api/batches` | GET | List batches |
| `/api/batches/[id]` | GET | Batch detail + URLs |
| `/api/credentials` | GET/POST | GCP credentials |
| `/api/worker/process` | POST | Cron trigger (set `WORKER_SECRET`) |

## Production notes

- Run `npm run worker` as a separate process (PM2, systemd, or container)
- Set `WORKER_SECRET` and call `POST /api/worker/process` from cron if you prefer HTTP triggers
- Set `APP_URL` to your production domain so crawl-trap RSS and feed pings use the correct URL
- Configure `INDEXNOW_HOST` and `INDEXNOW_KEY` for cross-engine pings (serves `/{key}.txt` automatically)
- Set `CREDENTIAL_ENCRYPTION_KEY` (32+ chars) separate from `AUTH_SECRET` in production
- Add real seed domains via MongoDB `SeedDomain` collection or extend `scripts/seed.ts`
- Crawl-trap RSS feed: `GET /feeds/live-index.xml`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (auto-processes jobs on submit) |
| `npm run dev:clean` | Clear `.next` cache and start dev |
| `npm run dev:all` | Dev server + background worker |
| `npm run build` | Production build |
| `npm run worker` | Process job queue (required in production) |
| `npm run seed` | Seed default crawl-trap domain |
| `npm test` | Run unit tests |
