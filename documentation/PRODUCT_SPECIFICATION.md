# PicClick Watcher — Product Specification

**Version:** 0.1 (Draft)  
**Date:** June 23, 2026  
**Status:** Awaiting approval to build  
**Repository:** `picclick-scraper-electron`

---

## 1. Executive Summary

PicClick Watcher is a cross-platform desktop application (Electron) that monitors [PicClick](https://picclick.com) search results on a schedule, applies user-defined filters, detects new or matching listings, and sends rich alerts to a Discord channel via webhook.

The app is designed for collectors and resellers who want hands-off monitoring of trading cards and memorabilia aggregated from eBay, Amazon, and other marketplaces — without manually refreshing search pages.

**Primary value proposition:** Configure once, run in the background, get instant Discord notifications when a listing matches your criteria.

---

## 2. Goals & Non-Goals

### Goals

| # | Goal |
|---|------|
| G1 | Monitor multiple independent search "watchers" concurrently |
| G2 | Mirror PicClick's filter/sort capabilities as closely as practical |
| G3 | Send Discord alerts with title, price, image, source link, and watcher name |
| G4 | Deduplicate alerts so the same listing never notifies twice per watcher |
| G5 | Ship as a bundled `.dmg` (macOS) and `.exe`/installer (Windows) with no Node.js install required |
| G6 | Deliver over-the-air (OTA) app updates to installed users automatically |
| G7 | Persist all configuration locally; no account or backend required for v1 |
| G8 | Full CRUD for watchers, filters, and Discord settings from the UI |

### Non-Goals (v1)

| # | Non-Goal | Rationale |
|---|----------|-----------|
| NG1 | Mobile app | Desktop-first; Electron covers macOS + Windows |
| NG2 | Multi-user cloud sync | Adds backend complexity; defer to v2 |
| NG3 | Scraping eBay/Amazon directly | PicClick is the aggregation layer |
| NG4 | In-app purchasing or payments | Out of scope |
| NG5 | Browser extension | Electron desktop app is the delivery vehicle |

---

## 3. Target Users

| Persona | Need |
|---------|------|
| **Card collector** | Alert when a specific player/card/set appears under a price ceiling |
| **Flipper / reseller** | Catch newly listed items fast (sort: Newly Listed) with high watcher counts |
| NG4 | **Shop operator** | Run 10–50 watchers for different players/products simultaneously |

---

## 4. PicClick Source Analysis

Based on live inspection of `https://picclick.com/?q=messi`:

### 4.1 URL Structure

| Parameter | Example | Notes |
|-----------|---------|-------|
| `q` | `?q=messi` | Search query (required) |
| Category | TBD during implementation | PicClick exposes category chips (e.g. Sports Trading Cards) |
| Filters | TBD | UI exposes many filters; URL encoding to be reverse-engineered |
| Sort | TBD | Best Match, Newly Listed, Ending Soon, Price Low/High, Most Watched |
| Pagination | TBD | Grid shows ~100 items per page; pagination params to be confirmed |

> **Implementation note:** Phase 1 spike will map PicClick filter UI controls to query parameters or POST bodies. If filters are client-side only, we fall back to server-side post-filtering on scraped results.

### 4.2 Listing Data Fields (per tile)

| Field | Example | Used For |
|-------|---------|----------|
| Title | `2026 Panini Instant FIFA World Cup #46 Lionel Messi Argentina PRESALE` | Keyword matching, Discord embed |
| Price | `$7.49` | Min/max price filters |
| Listing type | `Buy It Now`, `Auction`, `Buy It Now or Best Offer` | Listing-type filter |
| Watcher count | `66 watchers` | Optional min-watchers filter |
| Image URL | Product thumbnail | Discord embed thumbnail |
| eBay link | Behind "See on eBay" button | Primary alert link |
| Amazon link | Behind Amazon button | Optional secondary link |
| Seller badges | `Top-Rated Plus Seller` | Optional filter |
| Strikethrough price | `~~$119.00~~ $47.60` | Sale detection |

### 4.3 PicClick Filters to Support

Mirroring the PicClick UI (from captured page):

**Listing type**
- All Listings, Auctions, Auctions without Bids, Auctions with Bids, Buy It Now, Accepts Offers

**Shipping & returns**
- Free Shipping, Returns Accepted

**Time-based**
- Listings ending within 24 hours, Listings new within last 7 days

**Condition**
- New, Used, Unspecified

**Price range**
- Min / Max (USD)

**Location**
- Default, US, North America, Worldwide

**Sports/card-specific** (when category applies)
- Graded (Yes/No/Not Specified)
- Team, Player, Set, Year, Card Number, Parallel/Variety, etc.

**Sort options**
- Best Match, Newly Listed, Ending Soon, Price Lowest, Price Highest, Distance, Most Watched

**App-level filters** (applied after scrape, always available)
- Title must contain (keywords, comma-separated)
- Title must not contain (exclude keywords)
- Min / max price
- Min watcher count
- Source preference: eBay only, Amazon only, either

---

## 5. Feature Specification

### 5.1 Watchers

A **Watcher** is a saved monitoring job.

| Property | Type | Description |
|----------|------|-------------|
| `id` | UUID | Stable identifier |
| `name` | string | User label, e.g. "Messi Panini Instant under $10" |
| `enabled` | boolean | Pause/resume without deleting |
| `searchQuery` | string | PicClick `q` parameter |
| `category` | string? | Optional PicClick category slug |
| `picclickFilters` | object | PicClick-native filters (URL-mapped) |
| `appFilters` | object | Post-scrape filters (keywords, price, etc.) |
| `sort` | enum | PicClick sort option |
| `pollIntervalMinutes` | number | How often to check (min 1, default 5) |
| `discordWebhookUrl` | string? | Override global webhook; null = use global |
| `alertOn` | enum | `new_listings` \| `all_matches` (default: `new_listings`) |
| `lastCheckedAt` | ISO datetime | Last successful poll |
| `lastError` | string? | Last scrape error message |
| `createdAt` / `updatedAt` | ISO datetime | Audit |

**Behavior:**
- Each watcher runs on its own interval (staggered start to avoid burst requests).
- Disabled watchers do not poll.
- "Test watcher" button runs one immediate scrape and shows results in UI without sending Discord (unless user opts in).

### 5.2 Alert / Hit Detection

| Mode | Trigger |
|------|---------|
| `new_listings` (default) | Listing ID not seen before for this watcher |
| `all_matches` | Every poll where listing still matches (not recommended; opt-in) |

**Deduplication key:** Hash of `(watcherId, listingId)` where `listingId` is derived from eBay item ID, Amazon ASIN, or fallback URL hash.

**Alert cooldown (optional per watcher):** Suppress re-alert for same listing within N hours.

### 5.3 Discord Notifications

Uses Discord Incoming Webhooks (already configured in `.env` for development).

**Embed format:**

```
🃏 New Match — {watcherName}
─────────────────────────────
{title}
💰 {price} · {listingType}
👀 {watcherCount} watchers (if available)
🔗 [View on eBay]({ebayUrl}) · [Amazon]({amazonUrl})
📷 thumbnail: {imageUrl}
⏱ Found at {timestamp}
```

**Settings (global):**
- Default webhook URL
- Optional @role ping (`<@&roleId>`)
- Toggle: include image, include Amazon link
- Test webhook button

**Security:** Webhook URLs stored locally in encrypted store (Electron `safeStorage` or OS keychain). Never bundled in the distributed app.

### 5.4 Dashboard UI (React + Vite)

| Screen | Purpose |
|--------|---------|
| **Home / Dashboard** | Active watchers, last poll status, recent alerts log |
| **Watchers** | List, create, edit, duplicate, delete, enable/disable |
| **Watcher Editor** | Full filter form with PicClick + app-level filters |
| **Alerts History** | Paginated log of sent notifications with links |
| **Settings** | Discord webhook, global poll defaults, update channel, theme |
| **Logs** | Scraper debug log (collapsible, for troubleshooting) |

**UX principles:**
- Watcher cards show: name, query, interval, last check, status badge (OK / Error / Disabled)
- Inline "Run now" and "Edit" actions
- Toast notifications for errors and successful test runs
- Dark/light mode (system preference default)

### 5.5 System Tray

- Minimize to tray; app keeps polling in background
- Tray menu: Open, Pause all watchers, Quit
- Optional native notification on macOS/Windows in addition to Discord

### 5.6 OTA Updates

| Component | Choice |
|-----------|--------|
| Library | `electron-updater` (part of electron-builder ecosystem) |
| Release host | GitHub Releases (recommended for open distribution) |
| Channels | `stable` (default), `beta` (opt-in in Settings) |
| Flow | App checks on startup + every 6 hours → download in background → prompt user to restart |

**Alternative:** Custom update server (S3 + CloudFront) if GitHub Releases is insufficient for private distribution.

---

## 6. Technical Architecture

### 6.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Application                     │
├──────────────────────────┬──────────────────────────────────┤
│   Renderer (React/Vite)  │        Main Process (Node/TS)     │
│                          │                                   │
│  • Watcher CRUD UI       │  • Watcher scheduler (node-cron)  │
│  • Filter forms          │  • PicClick scraper service       │
│  • Settings              │  • Filter engine                  │
│  • Alert history         │  • Discord webhook client         │
│  • Zustand / React Query │  • SQLite persistence (better-sqlite3) │
│                          │  • IPC handlers                   │
│                          │  • electron-updater               │
│                          │  • safeStorage for secrets        │
├──────────────────────────┴──────────────────────────────────┤
│              Preload Script (contextBridge IPC)              │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   PicClick.com                   Discord Webhook API
   (HTTPS scrape)                (HTTPS POST)
```

### 6.2 Process Separation

| Layer | Responsibility |
|-------|----------------|
| **Main** | Scraping, scheduling, DB, Discord, updates — never expose Node to renderer |
| **Preload** | Typed IPC bridge (`window.api.watchers.create(...)`) |
| **Renderer** | Pure UI; no direct filesystem or network access |

### 6.3 IPC API (typed)

```typescript
// Example preload contract
watchers: {
  list(): Promise<Watcher[]>
  get(id: string): Promise<Watcher>
  create(data: CreateWatcherInput): Promise<Watcher>
  update(id: string, data: UpdateWatcherInput): Promise<Watcher>
  delete(id: string): Promise<void>
  runNow(id: string): Promise<ScrapeResult>
  testDiscord(webhookUrl: string): Promise<void>
}
settings: {
  get(): Promise<AppSettings>
  update(data: Partial<AppSettings>): Promise<AppSettings>
}
alerts: {
  list(watcherId?: string, page?: number): Promise<AlertLogPage>
}
logs: {
  tail(lines?: number): Promise<LogEntry[]>
}
app: {
  getVersion(): Promise<string>
  checkForUpdates(): Promise<UpdateStatus>
}
```

---

## 7. Tech Stack

### 7.1 Core

| Layer | Technology | Version Target | Why |
|-------|------------|----------------|-----|
| Runtime | Electron | ^33.x | Cross-platform desktop, auto-update support |
| Language | TypeScript | ^5.x | Type safety across main + renderer |
| Main process | Node.js | (Electron bundled) | Scraping, scheduling, IPC |
| Renderer | React | ^19.x | Component UI |
| Build (renderer) | Vite | ^6.x | Fast HMR in dev, optimized prod bundle |
| Electron bundler | electron-vite | ^3.x | Unified main/preload/renderer build |
| Packaging | electron-builder | ^25.x | DMG, NSIS, auto-update artifacts |

### 7.2 Main Process Libraries

| Library | Purpose |
|---------|---------|
| `better-sqlite3` | Local SQLite for watchers, seen listings, alert log |
| `node-cron` | Watcher poll scheduling |
| `cheerio` | HTML parsing (primary scrape strategy) |
| `playwright-core` + `@playwright/browser-chromium` | Fallback if PicClick requires JS rendering |
| `undici` / native `fetch` | HTTP requests with retry + timeout |
| `p-queue` | Concurrency limit for parallel watcher polls |
| `winston` | Structured logging to file |
| `electron-updater` | OTA updates |
| `zod` | Runtime validation for configs and IPC payloads |

### 7.3 Renderer Libraries

| Library | Purpose |
|---------|---------|
| `react-router-dom` | In-app routing |
| `@tanstack/react-query` | Server state / IPC caching |
| `zustand` | Lightweight UI state |
| `tailwindcss` + `shadcn/ui` | Styling and accessible components |
| `react-hook-form` + `@hookform/resolvers` | Watcher/filter forms |
| `lucide-react` | Icons |

### 7.4 Dev Tooling

| Tool | Purpose |
|------|---------|
| `eslint` + `prettier` | Lint/format |
| `vitest` | Unit tests (filter engine, URL builder, parser) |
| `playwright` (test) | Optional integration tests against PicClick HTML fixtures |
| `husky` + `lint-staged` | Pre-commit hooks |
| `conventional-changelog` | Release notes for OTA |

---

## 8. Data Model

### 8.1 SQLite Schema

```sql
-- watchers
CREATE TABLE watchers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  search_query TEXT NOT NULL,
  category TEXT,
  picclick_filters_json TEXT NOT NULL DEFAULT '{}',
  app_filters_json TEXT NOT NULL DEFAULT '{}',
  sort TEXT NOT NULL DEFAULT 'best_match',
  poll_interval_minutes INTEGER NOT NULL DEFAULT 5,
  discord_webhook_url TEXT,
  alert_on TEXT NOT NULL DEFAULT 'new_listings',
  last_checked_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- seen listings (dedup)
CREATE TABLE seen_listings (
  watcher_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  PRIMARY KEY (watcher_id, listing_id),
  FOREIGN KEY (watcher_id) REFERENCES watchers(id) ON DELETE CASCADE
);

-- alert log
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  watcher_id TEXT NOT NULL,
  listing_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price REAL,
  currency TEXT DEFAULT 'USD',
  ebay_url TEXT,
  amazon_url TEXT,
  image_url TEXT,
  sent_at TEXT NOT NULL,
  discord_status TEXT NOT NULL,
  FOREIGN KEY (watcher_id) REFERENCES watchers(id) ON DELETE CASCADE
);

-- app settings (key-value)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 8.2 Config File Locations

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/PicClick Watcher/` |
| Windows | `%APPDATA%/PicClick Watcher/` |

Contents: `watcher.db`, `logs/`, `cache/` (optional HTML cache)

---

## 9. Scraping Strategy

### 9.1 Primary: HTTP + Cheerio

1. Build PicClick URL from watcher config
2. `GET` with browser-like User-Agent, 15s timeout, 2 retries with exponential backoff
3. Parse listing grid with Cheerio selectors (determined in implementation spike)
4. Normalize to `Listing` objects
5. Apply app-level filters
6. Diff against `seen_listings`

**Rate limiting:** Max 1 concurrent request per watcher; global max 3 concurrent PicClick requests.

### 9.2 Fallback: Headless Chromium

If PicClick serves empty shells without JS:
- Use Playwright in main process (reuse Electron's Chromium where possible)
- Heavier memory footprint; enable only when needed

### 9.3 Listing ID Extraction

| Source | ID |
|--------|-----|
| eBay | Item ID from URL (`/itm/123456789`) |
| Amazon | ASIN from URL |
| Fallback | SHA-256 of canonical URL |

### 9.4 Error Handling

| Error | Action |
|-------|--------|
| HTTP 429 / 503 | Back off watcher 3× interval; log warning |
| Parse failure | Log HTML snippet; set watcher `lastError`; no Discord spam |
| Network offline | Skip poll; retry next interval |
| Discord failure | Retry 3×; log to alerts with `discord_status: failed` |

---

## 10. Project Structure

```
picclick-scraper-electron/
├── documentation/
│   └── PRODUCT_SPECIFICATION.md      ← this file
├── electron/
│   ├── main/
│   │   ├── index.ts                  # App entry, window, tray
│   │   ├── ipc/                      # IPC handlers
│   │   ├── services/
│   │   │   ├── scraper/              # PicClick fetch + parse
│   │   │   ├── scheduler/            # Cron watcher runner
│   │   │   ├── discord/              # Webhook client
│   │   │   ├── filters/              # App-level filter engine
│   │   │   └── updater/              # OTA wrapper
│   │   └── db/                       # SQLite repos
│   └── preload/
│       └── index.ts                  # contextBridge API
├── src/                              # React renderer
│   ├── App.tsx
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   └── lib/
├── shared/                           # Types shared main ↔ renderer
│   └── types/
├── resources/                        # Icons, entitlements (macOS)
├── .env                              # Dev-only secrets (gitignored)
├── .env.example
├── electron.vite.config.ts
├── electron-builder.yml
├── package.json
└── README.md
```

---

## 11. Security & Privacy

| Concern | Mitigation |
|---------|------------|
| Discord webhook exposure | `safeStorage` encryption; `.env` dev-only; never in build artifacts |
| XSS in renderer | `contextIsolation: true`, `nodeIntegration: false`, CSP headers |
| Scraping ToS | User responsibility disclaimer; respectful rate limits |
| Updates | Code-signed builds (macOS notarization, Windows Authenticode) |
| Local data | SQLite file user-owned; export/import JSON for backup |

---

## 12. Distribution & OTA Release Pipeline

```
Developer push tag v1.2.0
        │
        ▼
GitHub Actions CI
  • lint + test
  • build macOS (arm64 + x64) + Windows
  • sign + notarize (secrets in CI)
  • upload to GitHub Releases
  • publish latest.yml / latest-mac.yml
        │
        ▼
Installed apps (electron-updater)
  • check release feed
  • download delta/full update
  • prompt restart
```

**CI requirements:** Apple Developer ID, Windows cert (optional v1), GitHub token for releases.

---

## 13. Development Phases

### Phase 0 — Spike (2–3 days)
- [ ] Map PicClick URL params for filters/sort/pagination
- [ ] Confirm Cheerio-only vs Playwright requirement
- [ ] Parse 100 listings reliably from `?q=messi`
- [ ] Send test Discord embed

### Phase 1 — MVP Core (1–2 weeks)
- [ ] Electron + Vite + React scaffold
- [ ] SQLite + watcher CRUD
- [ ] Scheduler + scraper + dedup
- [ ] Discord alerts
- [ ] Basic UI: watcher list, editor, settings
- [ ] System tray

### Phase 2 — Full Filters & Polish (1 week)
- [ ] PicClick filter URL mapping in UI
- [ ] App-level keyword/price/watcher filters
- [ ] Alert history + logs viewer
- [ ] Export/import watchers JSON

### Phase 3 — Packaging & OTA (3–5 days)
- [ ] electron-builder config (DMG + NSIS)
- [ ] GitHub Releases + electron-updater
- [ ] App icons, code signing setup docs
- [ ] README quick-start for end users

### Phase 4 — Hardening (ongoing)
- [ ] PicClick HTML change detection / parser tests with fixtures
- [ ] Rate limit tuning
- [ ] Beta update channel

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PicClick HTML structure changes | Scraper breaks | Fixture-based tests; parser version flag; quick patch via OTA |
| PicClick blocks automated requests | No results | Rotating User-Agent, backoff, optional proxy setting (v2) |
| Filter URL params undocumented | Incomplete filter parity | Post-scrape app filters as reliable fallback |
| Discord webhook rate limits | Missed alerts | Queue alerts; batch if >30/min |
| Electron app size (~150MB) | Large download | Acceptable for desktop; delta updates reduce patch size |
| macOS notarization complexity | Can't distribute on macOS | Document CI setup; provide unsigned build for dev |

---

## 15. Open Questions (for your input)

1. **Platforms v1:** macOS only first, or macOS + Windows together?
2. **Update host:** GitHub Releases (public) or private S3 bucket?
3. **Default poll interval:** 5 minutes acceptable, or prefer 1–2 min (higher block risk)?
4. **Alert scope:** Only `new_listings`, or also price drops on seen items (v2)?
5. **Category default:** Always "All Categories" or restrict to Sports Trading Cards?
6. **Branding:** App name "PicClick Watcher" or your preferred product name?
7. **Code signing:** Do you have Apple Developer + Windows certs for distribution?

---

## 16. Success Criteria (v1 Done)

- [ ] User can create 10+ watchers with distinct queries and filters
- [ ] App polls in background and survives minimize/restart
- [ ] New matching listing triggers Discord embed within one poll cycle
- [ ] Same listing never alerts twice for the same watcher
- [ ] User can install `.dmg` / `.exe` without terminal or Node
- [ ] OTA update from v1.0.0 → v1.0.1 works on macOS and Windows
- [ ] Webhook URL configurable in UI (not hardcoded)

---

## 17. Appendix: Environment Variables (Development)

```bash
# .env (local dev only — not shipped)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Optional
LOG_LEVEL=debug
UPDATE_CHANNEL=stable
```

Production app stores webhook in encrypted local settings via UI.

---

*End of specification. Awaiting approval to proceed with Phase 0 spike and scaffold.*
