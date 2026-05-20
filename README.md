# WhiteIndexWay

Instant Google URL indexing platform — paste URLs, spend credits, track live Google + multi-engine status.

## Features

- **Google Instant** (default) — Indexing API + batch IndexNow + GSC sitemap + metadata verify
- **Turbo** — all signals (2 credits/URL): API, crawl trap, IndexNow, GSC inspect, WebSub
- **Hybrid / Maximum** — quota-friendly or full multi-signal modes
- **Feed Discovery** — index without GCP: RSS, WebSub, IndexNow, and discovery pings
- **Preflight checks** — HTTP 200, noindex, robots.txt, JobPosting schema hints
- **Multi GCP key pool** — rotate platform keys for 200+ URLs/day per key
- **Per-user IndexNow** — Bing/Yandex on the user's own domain
- **Credit packages** — in-app purchase (demo mode via `ALLOW_DEMO_CREDITS`)
- **Live dashboard** — SUBMITTED → INDEXED + GSC inspection data

## Quick start

```bash
cp .env.example .env.local
npm install
npm run seed
npm run seed:keys   # import PLATFORM_GCP_* keys into DB
npm run dev
```

### Required env

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Database |
| `AUTH_SECRET` | Sessions (32+ chars) |
| `APP_URL` | Public URL for RSS + batch sitemaps |
| `PLATFORM_GCP_SERVICE_ACCOUNT_JSON` or `PLATFORM_GCP_KEYS_JSON` | Platform Google API keys |
| `ALLOW_DEMO_CREDITS=true` | Enable test credit purchases |

Add each platform service account as **Owner** in Google Search Console for target sites.

## Indexing modes

| Mode | What runs |
|------|-----------|
| **google_instant** | Google API + batch IndexNow + GSC sitemap + verify |
| **turbo** | Everything above + crawl trap + WebSub + GSC inspect (2 credits/URL) |
| **hybrid** | ~30% Google API, ~70% crawl trap (configurable) |
| **maximum** | Google API + crawl trap + IndexNow on all URLs |
| **feed_discovery** | No Google key — RSS crawl trap, WebSub, IndexNow & discovery pings (1 credit/URL) |

## New API routes

| Route | Description |
|-------|-------------|
| `GET/POST /api/settings/indexnow` | Per-user IndexNow host + key |
| `GET /feeds/batch/{id}` | Dynamic XML sitemap per batch (for GSC) |
| `GET /feeds/live-index.xml` | Crawl-trap RSS feed |

## Admin: GCP key pool

1. Set `ADMIN_EMAILS=your@email.com` in `.env.local` (comma-separated for multiple admins).
2. Sign in with that account → sidebar **GCP key pool** (or open `/dashboard/platform-keys`).
3. Add service accounts (encrypted in MongoDB). Workers auto-rotate to the least-used key under 200/day each.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (auto-processes queue on submit) |
| `npm run worker` | Background job processor |
| `npm run seed` | Seed crawl-trap domain |
| `npm run seed:keys` | Import platform GCP keys from env |
| `npm test` | Unit tests |

## Honest note

We deliver official Google Indexing API notifications and multi-engine signals as fast as the APIs allow. **Google decides** final indexing in search results; JobPosting/BroadcastEvent pages see the fastest results.
