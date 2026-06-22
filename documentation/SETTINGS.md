# Settings

## Problem it solves

Users need one place to configure the Discord webhook, notification preferences, default polling behavior, OTA updates, and app metadata — persisted locally per installation.

## How it solves it

Settings are stored as key-value JSON in SQLite (`settings` table), loaded into a React Hook Form on mount, and saved via IPC. No `.env` file is used at runtime for the webhook.

## UI sections

| Section | Purpose |
|---------|---------|
| **Discord** | Webhook URL, test message, embed toggles (image, Amazon link) |
| **Defaults** | Default poll interval, update channel (stable/beta) |
| **Updates** | Manual check, install downloaded OTA update |
| **About footer** | Built by Ekram, version, GitHub profile, support email |

## Files

| File | Purpose |
|------|---------|
| `src/pages/SettingsPage.tsx` | Full settings UI + about footer |
| `src/components/layout/UpdateBanner.tsx` | Global OTA banner (also listens to update events) |
| `electron/main/db/database.ts` | `getSettings()`, `updateSettings()`, `DEFAULT_SETTINGS` |
| `electron/main/services/discord/index.ts` | `sendTestDiscord()` |
| `electron/main/services/updater/index.ts` | OTA check/install |
| `electron/main/ipc/index.ts` | Settings + app IPC handlers |

## AppSettings type

```typescript
interface AppSettings {
  discordWebhookUrl: string
  defaultPollIntervalMinutes: number
  includeAmazonLink: boolean
  includeImage: boolean
  updateChannel: 'stable' | 'beta'
  startMinimized: boolean
  theme: 'dark' | 'light' | 'system'
}
```

Stored in DB as individual keys with JSON-serified values.

## IPC reference

| Renderer | Channel | Main function |
|----------|---------|---------------|
| `settings.get()` | `settings:get` | `db.getSettings()` |
| `settings.update(partial)` | `settings:update` | `db.updateSettings()` |
| `settings.testDiscord(url?)` | `settings:testDiscord` | `sendTestDiscord()` |
| `app.getVersion()` | `app:getVersion` | `app.getVersion()` |
| `app.checkForUpdates()` | `app:checkForUpdates` | `checkForUpdates()` |
| `app.installUpdate()` | `app:installUpdate` | `installUpdate()` |

## Webhook resolution order

When sending alerts (`watcher-runner.ts`):

```
watcher.discordWebhookUrl  →  if empty  →  settings.discordWebhookUrl
```

Per-watcher override is set in Watcher Form → Alerts tab.

## How to extend

### Add a new setting

1. Add field to `AppSettings` in `shared/types/index.ts`
2. Add default in `DEFAULT_SETTINGS` (`database.ts`)
3. `updateSettings()` already merges partial updates — no change needed
4. Add form control in `SettingsPage.tsx`
5. Read setting where needed (e.g. scraper, discord, scheduler)

### Encrypt webhook at rest

Use Electron `safeStorage.encryptString()` in `updateSettings` / `getSettings` — wrap only `discordWebhookUrl`.

### Theme switcher

`theme` field exists but UI not wired. Implement by toggling `document.documentElement.classList` in a `useEffect` when setting changes.

### Persist window size/position

1. Listen to `BrowserWindow` `resize`/`move` in `main/index.ts`
2. Save to `settings` table
3. Restore in `createWindow()`

## Related docs

- [DISCORD.md](./DISCORD.md)
- [UPDATES.md](./UPDATES.md)
- [DATABASE.md](./DATABASE.md)
