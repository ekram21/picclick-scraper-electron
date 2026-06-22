# PicClick Watcher

Desktop app that monitors [PicClick](https://picclick.com) searches and sends Discord alerts when new listings match your filters.

## Quick start (development)

### 1. Install dependencies

```bash
npm install
```

### 2. Run the app

```bash
npm run dev
```

This starts Electron with hot reload for the React UI.

> **Cursor / VS Code terminal note:** If the app crashes with `Cannot read properties of undefined (reading 'isPackaged')`, your shell may have `ELECTRON_RUN_AS_NODE=1` set. The dev script already unsets this on macOS. On Windows use `cross-env` or run from a normal terminal.

## What to do first in the app

1. Open **Settings** → paste your Discord webhook URL → **Save Settings** → **Send Test Message**
2. Go to **Watchers** → **Add Watcher**
3. Set a search query (e.g. `messi`), filters, and poll interval
4. Click **Test Run** on the watcher to verify scraping
5. Enable the watcher — it will poll in the background and alert Discord on new matches

## Build for distribution

```bash
# macOS (.dmg + zip)
npm run dist:mac

# Windows (NSIS installer)
npm run dist:win

# Both (on respective OS)
npm run dist
```

Installers are written to `release/`.

## Over-the-air (OTA) updates

Installed apps auto-check for updates via `electron-updater` + GitHub Releases.

### Deploy a live update

```bash
npm run deploy:live
```

Auto-bumps version, pushes to GitHub, builds macOS + Windows, and ships OTA to all installed users. See [documentation/OTA_UPDATES.md](documentation/OTA_UPDATES.md) for full details.

## Developer documentation

Module-by-module guides for extending the project: [documentation/README.md](documentation/README.md)

## Project structure

```
electron/main/     # Scraper, scheduler, Discord, SQLite, OTA
electron/preload/  # Secure IPC bridge
src/               # React + Tailwind + shadcn UI
shared/types/      # Shared TypeScript types
```

## Tech stack

- Electron + electron-vite
- React 19 + Vite + Tailwind CSS 4 + shadcn-style components
- better-sqlite3 for local storage
- cheerio for PicClick HTML parsing
- electron-updater for OTA updates

## Notes

- Close the window to minimize to tray; the app keeps monitoring in the background
- Use **Newly Listed** sort + **New within 7 days** filter for fastest hit detection
- Respect PicClick rate limits — default poll interval is 5 minutes
