# WhiteIndexWay

Hybrid URL indexing platform built with **Next.js 16**, **MongoDB**, and a background worker queue.

## Features

- **Hybrid routing** — ~30% Google Indexing API, ~70% crawl-trap discovery + IndexNow
- **User accounts** — JWT session cookies, credit-based submissions
- **GCP credentials** — encrypted service account storage for Indexing API lane
- **Batch tracking** — per-URL status, route type, and error messages
- **MongoDB job queue** — `ProcessingJob` collection processed by `npm run worker`

## Quick start

### 1. Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

- `MONGODB_URI` — MongoDB connection string
- `AUTH_SECRET` — at least 32 random characters

### 2. Install & run

```bash
npm install
npm run seed    # optional: default seed domain
npm run dev     # http://localhost:3000
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
- Configure `INDEXNOW_HOST` and `INDEXNOW_KEY` for cross-engine pings
- Add real seed domains via MongoDB `SeedDomain` collection or extend `scripts/seed.ts`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (auto-processes jobs on submit) |
| `npm run dev:clean` | Clear `.next` cache and start dev |
| `npm run dev:all` | Dev server + background worker |
| `npm run build` | Production build |
| `npm run worker` | Process job queue (required in production) |
| `npm run seed` | Seed default crawl-trap domain |
