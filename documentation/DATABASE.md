# Database

## Problem it solves

The app needs durable local storage for watchers, deduplication state, alert history, and settings — without a cloud backend or account system.

## How it solves it

**SQLite** via `better-sqlite3`, single file in Electron `userData` directory.

Path (macOS): `~/Library/Application Support/PicClick Watcher/watcher.db`

## Files

| File | Purpose |
|------|---------|
| `electron/main/db/database.ts` | `DatabaseService` class — all SQL |

## Schema

### `watchers`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT | Display name |
| enabled | INTEGER | 0/1 boolean |
| search_query | TEXT | PicClick `q` |
| picclick_filters_json | TEXT | JSON `PicClickFilters` |
| app_filters_json | TEXT | JSON `AppFilters` |
| sort | TEXT | SortOption enum |
| poll_interval_minutes | INTEGER | Cron interval |
| discord_webhook_url | TEXT | Optional override |
| alert_on | TEXT | `new_listings` \| `all_matches` |
| last_checked_at | TEXT | ISO datetime |
| last_error | TEXT | Last scrape error message |
| created_at / updated_at | TEXT | ISO datetime |

### `seen_listings`

| Column | Purpose |
|--------|---------|
| watcher_id + listing_id | Composite PK — dedup |
| first_seen_at | When first matched |

### `alerts`

Alert history for UI. See [ALERTS.md](./ALERTS.md).

### `settings`

Key-value store. Keys match `AppSettings` fields; values are JSON-stringified.

## DatabaseService methods

| Method | Used by |
|--------|---------|
| `listWatchers()` / `getWatcher()` / `createWatcher()` / `updateWatcher()` / `deleteWatcher()` | Watcher IPC |
| `markWatcherChecked(id, error?)` | `watcher-runner.ts` |
| `hasSeenListing()` / `markListingSeen()` | Dedup in `watcher-runner.ts` |
| `saveAlert()` / `listAlerts()` | Alert history |
| `getStats()` | Dashboard |
| `getSettings()` / `updateSettings()` | Settings IPC |

## Migrations

Currently uses `CREATE TABLE IF NOT EXISTS` in `migrate()` on startup. No versioned migrations yet.

## How to extend

### Add a column

1. Add column in `migrate()` with `ALTER TABLE` or recreate pattern
2. Update `rowToWatcher()` / insert / update SQL
3. Update `shared/types`

### Versioned migrations

```typescript
private migrate(): void {
  const version = this.db.pragma('user_version', { simple: true })
  if (version < 2) {
    this.db.exec('ALTER TABLE watchers ADD COLUMN foo TEXT')
    this.db.pragma('user_version = 2')
  }
}
```

### Export / backup

Copy `watcher.db` from userData path, or add IPC to dump JSON of all tables.

### Clear seen listings for a watcher

Useful for "re-alert on all current matches":

```sql
DELETE FROM seen_listings WHERE watcher_id = ?
```

Expose as IPC `watchers:resetSeen`.

## Related docs

- [WATCHERS.md](./WATCHERS.md)
- [ALERTS.md](./ALERTS.md)
- [SETTINGS.md](./SETTINGS.md)
