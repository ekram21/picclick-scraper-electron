# Dashboard

## Problem it solves

Users need an at-a-glance view of whether monitoring is working: how many watchers are active, whether alerts fired today, and quick access to recent hits — without digging through settings or logs.

## How it solves it

The Dashboard aggregates read-only data from three IPC calls and refreshes every 15 seconds. It does not mutate state; it surfaces status and links to deeper pages.

### UI sections

1. **Stat cards** — total watchers, alerts today, active monitoring count
2. **Watchers list** — up to 6 watchers with status badges (Active / Paused / Error)
3. **Recent alerts** — last 5 Discord notifications; click opens eBay in browser

## Files

| File | Purpose |
|------|---------|
| `src/pages/DashboardPage.tsx` | Page component |
| `src/lib/utils.ts` | `formatRelativeTime()` for "5m ago" labels |
| `src/components/ui/card.tsx` | Stat card layout |
| `src/components/ui/badge.tsx` | Active / Error badges |

## IPC / backend used

| Renderer call | IPC channel | Main handler | Backend function |
|---------------|-------------|--------------|------------------|
| `window.api.app.getStats()` | `app:getStats` | `ipc/index.ts` | `DatabaseService.getStats()` |
| `window.api.watchers.list()` | `watchers:list` | `ipc/index.ts` | `DatabaseService.listWatchers()` |
| `window.api.alerts.list(5)` | `alerts:list` | `ipc/index.ts` | `DatabaseService.listAlerts(5)` |
| `window.api.app.openExternal(url)` | `app:openExternal` | `ipc/index.ts` | `shell.openExternal()` |

## Types

```typescript
// shared/types/index.ts
DashboardStats { totalWatchers, activeWatchers, alertsToday, lastAlertAt? }
Watcher { name, searchQuery, pollIntervalMinutes, enabled, lastError?, ... }
AlertRecord { title, watcherName, sentAt, ebayUrl?, ... }
```

## React Query keys

| Key | Invalidated when |
|-----|------------------|
| `['stats']` | Manual refresh only (15s poll) |
| `['watchers']` | Watcher CRUD, background poll updates |
| `['alerts']` | New alert saved in `watcher-runner.ts` |

## How to extend

### Add a new stat card

1. Add field to `DashboardStats` in `shared/types/index.ts`
2. Compute in `DatabaseService.getStats()` (`electron/main/db/database.ts`)
3. Expose via existing `app:getStats` IPC (no channel change needed)
4. Add card to `statCards` array in `DashboardPage.tsx`

### Add a quick action button

Add a `<Button asChild><Link to="...">` in the header row (see "New Watcher" pattern).

### Show live scrape progress

Subscribe to a new IPC event from scheduler (e.g. `watcher:running`) and invalidate queries on completion — would require new emit in `SchedulerService`.

## Related docs

- [WATCHERS.md](./WATCHERS.md)
- [ALERTS.md](./ALERTS.md)
- [DATABASE.md](./DATABASE.md)
