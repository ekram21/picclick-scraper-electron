# PicClick Watcher — Developer Documentation

Use this folder to understand how the app works and how to extend it safely.

## Start here

| Doc | What it covers |
|-----|----------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full system overview, process model, data flow |
| [IPC.md](./IPC.md) | How renderer talks to main process |
| [DATABASE.md](./DATABASE.md) | SQLite schema, persistence, settings |

## Features (UI + backend)

| Doc | Screen / domain |
|-----|-----------------|
| [DASHBOARD.md](./DASHBOARD.md) | Home overview, stats, quick links |
| [WATCHERS.md](./WATCHERS.md) | Creating, editing, polling monitors |
| [ALERTS.md](./ALERTS.md) | Alert history, Discord notification records |
| [SETTINGS.md](./SETTINGS.md) | Webhook, defaults, OTA, about footer |

## Core services (main process)

| Doc | Responsibility |
|-----|----------------|
| [SCRAPER.md](./SCRAPER.md) | PicClick HTTP fetch, HTML parse, URL building |
| [SCHEDULER.md](./SCHEDULER.md) | Cron polling, job queue, run-now |
| [DISCORD.md](./DISCORD.md) | Webhook embeds, test messages |
| [FILTERS.md](./FILTERS.md) | App-level post-scrape filtering |
| [UPDATES.md](./UPDATES.md) | OTA updates (`electron-updater`) |

## UI shell

| Doc | Responsibility |
|-----|----------------|
| [UI.md](./UI.md) | Layout, title bar, sidebar, shadcn components |

## Product & release

| Doc | Responsibility |
|-----|----------------|
| [PRODUCT_SPECIFICATION.md](./PRODUCT_SPECIFICATION.md) | Original product spec |
| [OTA_UPDATES.md](./OTA_UPDATES.md) | How to ship live updates to users |
| [MACOS_SIGNING.md](./MACOS_SIGNING.md) | Apple Developer ID signing + notarization for CI |

## Quick extension guide

1. **New UI page** → Add route in `src/App.tsx`, page in `src/pages/`, nav link in `Sidebar.tsx`, IPC if needed.
2. **New watcher field** → Update `shared/types`, DB migration in `database.ts`, form in `WatcherFormPage.tsx`, URL builder if PicClick param.
3. **New filter** → `AppFilters` type + `applyAppFilters()` or `PicClickFilters` + `buildPicClickUrl()`.
4. **New notification channel** → Mirror pattern in `discord/` + hook into `watcher-runner.ts`.

All types shared between main and renderer live in **`shared/types/index.ts`**.
