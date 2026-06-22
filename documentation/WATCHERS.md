# Watchers

## Problem it solves

Users need to define multiple independent monitoring jobs — each with its own PicClick search, filters, poll interval, and optional Discord webhook override — and manage them (create, edit, pause, delete, test) from the UI.

## How it solves it

A **Watcher** is a persisted record in SQLite. When enabled, the **Scheduler** registers a cron job that calls **`runWatcherJob()`** on that interval. The UI reads/writes watchers through IPC.

### User flows

| Flow | UI | Backend |
|------|-----|---------|
| List watchers | `WatchersPage.tsx` | `watchers:list` |
| Create watcher | `WatcherFormPage.tsx` → `/watchers/new` | `watchers:create` + `scheduleWatcher()` |
| Edit watcher | `WatcherFormPage.tsx` → `/watchers/:id` | `watchers:update` + reschedule |
| Delete watcher | `WatchersPage.tsx` | `watchers:delete` + unschedule |
| Test run (no alert opt-out) | "Test Run" button | `watchers:runNow(id, false)` |
| Live poll + alert | Scheduler cron | `runWatcherJob(id, true)` |

## Files

### Frontend

| File | Purpose |
|------|---------|
| `src/pages/WatchersPage.tsx` | List, delete, test run |
| `src/pages/WatcherFormPage.tsx` | Create/edit form (tabs: PicClick filters, app filters, alerts) |
| `shared/types/index.ts` | `Watcher`, `CreateWatcherInput`, `PicClickFilters`, `AppFilters` |

### Backend

| File | Purpose |
|------|---------|
| `electron/main/db/database.ts` | CRUD: `createWatcher`, `updateWatcher`, `deleteWatcher`, `listWatchers`, `getWatcher` |
| `electron/main/services/scheduler/index.ts` | `scheduleWatcher`, `unscheduleWatcher`, `runNow`, `refreshAll` |
| `electron/main/services/watcher-runner.ts` | `runWatcherJob()` — scrape → filter → dedupe → Discord |
| `electron/main/services/scraper/url-builder.ts` | `buildPicClickUrl()` — maps filters to query params |
| `electron/main/services/filters/index.ts` | `applyAppFilters()` — post-scrape rules |
| `electron/main/ipc/index.ts` | IPC handlers for all watcher operations |

## Watcher data model

```typescript
interface Watcher {
  id: string
  name: string
  enabled: boolean
  searchQuery: string              // PicClick ?q=
  picclickFilters: PicClickFilters // URL params (type, categoryId, sort, etc.)
  appFilters: AppFilters           // Applied after scrape (keywords, price)
  sort: SortOption
  pollIntervalMinutes: number
  discordWebhookUrl?: string       // Overrides global webhook
  alertOn: 'new_listings' | 'all_matches'
  lastCheckedAt?: string
  lastError?: string
}
```

## PicClick URL mapping

Built by `buildPicClickUrl()` in `url-builder.ts`:

| Filter | URL param |
|--------|-----------|
| Listing type | `type=BuyItNow`, etc. |
| Category | `categoryId=212` |
| Sort | `sort=StartTimeNewest` |
| Free shipping | `FreeShippingOnly=true` |
| New within 7 days | `StartTimeFrom=true` |
| Price range | `MinPrice`, `MaxPrice` |

Constants: `SORT_OPTIONS`, `LISTING_TYPE_OPTIONS`, `CATEGORY_OPTIONS` in same file.

## Deduplication

`seen_listings` table stores `(watcher_id, listing_id)`. New alerts only fire when `alertOn === 'new_listings'` and listing ID not seen before. Listing ID = eBay item ID from `<li id="item-{id}">`.

## How to extend

### Add a new PicClick filter

1. Add field to `PicClickFilters` in `shared/types/index.ts`
2. Map to URL param in `buildPicClickUrl()`
3. Add UI control in `WatcherFormPage.tsx` → PicClick Filters tab
4. Verify param against live PicClick HTML (see [SCRAPER.md](./SCRAPER.md))

### Add a new app-level filter

1. Add field to `AppFilters`
2. Implement logic in `applyAppFilters()` (`filters/index.ts`)
3. Add form field in App Filters tab

### Add bulk import/export

1. Add IPC `watchers:export` / `watchers:import` in `ipc/index.ts`
2. Serialize `Watcher[]` to JSON in handler
3. Add button on `WatchersPage.tsx`

### Change default poll interval for new watchers

Update `DEFAULT_SETTINGS.defaultPollIntervalMinutes` in `database.ts` and Settings UI default.

## Related docs

- [SCRAPER.md](./SCRAPER.md)
- [SCHEDULER.md](./SCHEDULER.md)
- [FILTERS.md](./FILTERS.md)
- [DISCORD.md](./DISCORD.md)
