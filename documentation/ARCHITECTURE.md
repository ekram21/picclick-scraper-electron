# Architecture

## Problem it solves

Users need a desktop app that runs in the background, polls PicClick on a schedule, and notifies them on Discord when listings match — without writing code or hosting a server.

## How it solves it

Electron splits the app into three layers:

```
┌─────────────────────────────────────────────────────────────┐
│  Renderer (React + Vite)     src/                           │
│  Dashboard, Watchers, Alerts, Settings                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ window.api (IPC via preload)
┌──────────────────────────▼──────────────────────────────────┐
│  Preload                     electron/preload/index.ts      │
│  contextBridge — typed, no raw Node in UI                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ ipcMain.handle / ipcRenderer.invoke
┌──────────────────────────▼──────────────────────────────────┐
│  Main process (Node.js)      electron/main/                 │
│  Scraper, Scheduler, Discord, SQLite, Updater               │
└─────────────────────────────────────────────────────────────┘
```

### End-to-end alert flow

```
Scheduler (cron)
  → runWatcherJob()
    → fetchPicClickListings()     # HTTP + Cheerio
    → applyAppFilters()           # keyword/price rules
    → dedupe via seen_listings
    → sendDiscordAlert()          # webhook POST
    → saveAlert()                 # SQLite history
```

## Key files

| File | Role |
|------|------|
| `electron/main/index.ts` | App entry: window, tray, DB, scheduler, updater |
| `electron/main/ipc/index.ts` | All IPC handlers |
| `electron/preload/index.ts` | Exposes `window.api` to renderer |
| `shared/types/index.ts` | Shared TypeScript contracts |
| `src/App.tsx` | React Router routes |
| `src/main.tsx` | React bootstrap + React Query |

## Build & run

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev with HMR |
| `npm run build` | Compile to `out/` |
| `npm run dist:mac` / `dist:win` | Packaged installer |
| `npm run deploy:live` | Bump version, tag, push OTA release |

Config: `electron.vite.config.ts`, `package.json` → `build` block.

## Data storage

- **SQLite:** `~/Library/Application Support/PicClick Watcher/watcher.db` (macOS)
- **Logs:** same folder → `logs/app.log`
- **Settings / webhook:** stored in SQLite `settings` table (not `.env` in production)

## Security model

- `contextIsolation: true`, `nodeIntegration: false`
- Renderer never calls PicClick or Discord directly
- External links via `shell.openExternal`

## Related docs

- [IPC.md](./IPC.md)
- [DATABASE.md](./DATABASE.md)
- [SCHEDULER.md](./SCHEDULER.md)
