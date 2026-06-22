# Scheduler

## Problem it solves

Watchers must poll PicClick automatically in the background at different intervals, without overlapping scrapes that hammer the site or block the UI.

## How it solves it

`SchedulerService` registers one **node-cron** job per enabled watcher. Jobs run through a **SimpleQueue** (max 2 concurrent). Manual "Test Run" uses the same queue via `runNow()`.

## Files

| File | Class / functions | Purpose |
|------|-------------------|---------|
| `electron/main/services/scheduler/index.ts` | `SchedulerService` | Cron registration, queue, IPC-triggered runs |
| `electron/main/services/watcher-runner.ts` | `runWatcherJob()` | Actual scrape + alert work |
| `electron/main/index.ts` | `scheduler.start()` | Started on app ready |
| `electron/main/ipc/index.ts` | Watcher CRUD hooks | Reschedule on create/update/delete |

## SchedulerService API

| Method | When called |
|--------|-------------|
| `start()` | App launch → `refreshAll()` |
| `refreshAll()` | Stop all crons, re-register enabled watchers |
| `scheduleWatcher(watcher)` | Create/update watcher |
| `unscheduleWatcher(id)` | Delete watcher |
| `runNow(id, sendAlerts?)` | Test Run button, IPC `watchers:runNow` |
| `stop()` | App quit |

## Cron expression

```typescript
const minutes = Math.max(1, watcher.pollIntervalMinutes)
const cronExpr = `*/${minutes} * * * *`  // every N minutes
```

## Concurrency

`SimpleQueue(2)` — at most 2 watcher jobs run simultaneously.

## UI notifications

After each job, scheduler emits `watcher:updated` to renderer with fresh watcher row (updates `lastCheckedAt`, `lastError`).

```typescript
win.webContents.send('watcher:updated', watcher)
```

Preload: `window.api.onWatcherUpdated(callback)`

## How to extend

### Stagger watcher start times

In `refreshAll()`, add random delay offset per watcher to avoid all firing at :00.

### Exponential backoff on errors

In `runWatcherJob` catch block or scheduler, track consecutive failures and temporarily increase interval.

### Global pause/resume

1. Add `settings.pausedAll` boolean
2. Check in cron callback before `runWatcherJob`
3. Tray menu item in `main/index.ts`

### Push live status to Dashboard

Emit `watcher:running` before job and `watcher:done` after; Dashboard subscribes via preload listener.

## Related docs

- [WATCHERS.md](./WATCHERS.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
