# Alerts

## Problem it solves

When a watcher finds a new matching listing, users need a Discord notification with the listing details and a link — plus an in-app history to review what was sent (or failed).

## How it solves it

Alerts are created in two places:

1. **Discord** — real-time webhook embed via `sendDiscordAlert()`
2. **SQLite `alerts` table** — permanent log for the Alerts page and Dashboard

Only **new** listings trigger alerts (unless watcher `alertOn === 'all_matches'`).

## Alert pipeline

```
runWatcherJob()
  → newMatches (not in seen_listings)
  → markListingSeen()          # always, before send
  → sendDiscordAlert()         # if webhook configured
  → saveAlert(discordStatus)   # 'sent' | 'failed'
```

## Files

### Frontend

| File | Purpose |
|------|---------|
| `src/pages/AlertsPage.tsx` | Full alert history (up to 100) |
| `src/pages/DashboardPage.tsx` | Recent 5 alerts widget |
| `src/lib/utils.ts` | `formatPrice()`, `formatRelativeTime()` |

### Backend

| File | Purpose |
|------|---------|
| `electron/main/services/watcher-runner.ts` | Orchestrates alert creation |
| `electron/main/services/discord/index.ts` | `sendDiscordAlert()`, `sendTestDiscord()` |
| `electron/main/db/database.ts` | `saveAlert()`, `listAlerts()` |
| `electron/main/ipc/index.ts` | `alerts:list` handler |

## Alert record shape

```typescript
interface AlertRecord {
  id: string
  watcherId: string
  watcherName: string
  listingId: string
  title: string
  price?: number
  currency: string
  ebayUrl?: string
  amazonUrl?: string      // Amazon search URL, not direct product
  imageUrl?: string
  sentAt: string
  discordStatus: 'sent' | 'failed'
}
```

## Discord embed contents

Built in `sendDiscordAlert()`:

| Field | Source |
|-------|--------|
| Title | Listing title |
| Watcher name | `watcher.name` |
| Price + listing type | `listing.price`, `listing.listingType` |
| Watcher count | `listing.watcherCount` (if present) |
| eBay link | `listing.ebayUrl` |
| Amazon link | Optional via `settings.includeAmazonLink` |
| Thumbnail | Optional via `settings.includeImage` |

Global embed settings come from `AppSettings` in SQLite.

## IPC

| Call | Channel | Handler |
|------|---------|---------|
| `window.api.alerts.list(limit)` | `alerts:list` | `db.listAlerts(limit)` |

## How to extend

### Add email or Slack alerts

1. Create `electron/main/services/slack/index.ts` (mirror `discord/`)
2. In `watcher-runner.ts`, call new sender alongside or instead of Discord
3. Add settings field + Settings UI toggle
4. Extend `AlertRecord.discordStatus` or add generic `channel` column (requires DB migration)

### Retry failed alerts

1. Add `alerts:retry` IPC that loads failed rows and re-sends
2. Query: `SELECT * FROM alerts WHERE discord_status = 'failed'`

### Filter alert history by watcher

1. Add optional `watcherId` param to `listAlerts(watcherId?, limit)`
2. Add dropdown filter on `AlertsPage.tsx`

### Richer embed (e.g. condition, seller)

1. Extend `Listing` type in parser if PicClick exposes field
2. Add to embed `fields` array in `sendDiscordAlert()`

## Related docs

- [DISCORD.md](./DISCORD.md)
- [WATCHERS.md](./WATCHERS.md)
- [SETTINGS.md](./SETTINGS.md)
