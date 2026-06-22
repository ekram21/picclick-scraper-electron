# IPC (Inter-Process Communication)

## Problem it solves

The React UI runs in a sandboxed renderer process without Node.js access. It needs a secure, typed way to call backend operations (DB, scraper, Discord, window controls).

## How it solves it

**Electron preload script** exposes `window.api` via `contextBridge`. Renderer calls async methods → `ipcRenderer.invoke` → `ipcMain.handle` in main process.

## Files

| File | Role |
|------|------|
| `electron/preload/index.ts` | Defines `window.api` surface |
| `electron/main/ipc/index.ts` | Registers all `ipcMain.handle` handlers |
| `shared/types/index.ts` | `Window.api` TypeScript interface |

## Channel map

### Watchers

| Channel | Handler | Returns |
|---------|---------|---------|
| `watchers:list` | `db.listWatchers()` | `Watcher[]` |
| `watchers:get` | `db.getWatcher(id)` | `Watcher \| null` |
| `watchers:create` | `db.createWatcher` + `scheduleWatcher` | `Watcher` |
| `watchers:update` | `db.updateWatcher` + reschedule | `Watcher` |
| `watchers:delete` | unschedule + delete | `void` |
| `watchers:runNow` | `scheduler.runNow(id, sendAlerts)` | `ScrapeResult` |

### Alerts

| Channel | Handler |
|---------|---------|
| `alerts:list` | `db.listAlerts(limit)` |

### Settings

| Channel | Handler |
|---------|---------|
| `settings:get` | `db.getSettings()` |
| `settings:update` | `db.updateSettings(data)` |
| `settings:testDiscord` | `sendTestDiscord(url)` |

### App

| Channel | Handler |
|---------|---------|
| `app:getVersion` | `app.getVersion()` |
| `app:getStats` | `db.getStats()` |
| `app:getPlatform` | `process.platform` |
| `app:checkForUpdates` | `checkForUpdates()` |
| `app:getUpdateStatus` | `getUpdateStatus()` |
| `app:installUpdate` | `installUpdate()` |
| `app:openExternal` | `shell.openExternal(url)` |

### Window

| Channel | Handler |
|---------|---------|
| `window:minimize` | `getWindow().minimize()` |
| `window:maximize` | toggle maximize |
| `window:close` | `getWindow().close()` |
| `window:isMaximized` | boolean |

### Logs

| Channel | Handler |
|---------|---------|
| `logs:tail` | `getRecentLogs(limit)` |

## Events (main → renderer)

| Event | Payload | Preload listener |
|-------|---------|------------------|
| `update:status` | `UpdateStatus` | `onUpdateStatus()` |
| `watcher:updated` | `Watcher` | `onWatcherUpdated()` |
| `window:maximized` | `boolean` | `window.onMaximizedChange()` |

## Adding a new IPC endpoint

1. **Type** — Add to `Window.api` in `shared/types/index.ts`
2. **Main** — `ipcMain.handle('domain:action', handler)` in `ipc/index.ts`
3. **Preload** — Expose method on `window.api` in `preload/index.ts`
4. **UI** — Call from React Query `queryFn` / `mutationFn`

Example — add `watchers:duplicate`:

```typescript
// ipc/index.ts
ipcMain.handle('watchers:duplicate', (_e, id: string) => {
  const w = db.getWatcher(id)
  if (!w) throw new Error('Not found')
  return db.createWatcher({ ...w, name: `${w.name} (copy)`, enabled: false })
})

// preload/index.ts
duplicate: (id: string) => ipcRenderer.invoke('watchers:duplicate', id)
```

## Security notes

- Never expose raw `ipcRenderer` or Node modules to renderer
- Validate all inputs in main process handlers
- `openExternal` only for http(s) and mailto URLs (consider validating in handler)

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
