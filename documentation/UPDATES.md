# Updates (OTA)

## Problem it solves

Installed users need to receive new versions automatically without manually downloading installers from GitHub.

## How it solves it

**electron-updater** checks GitHub Releases for a newer semver, downloads in background, prompts restart.

> Full release workflow: see [OTA_UPDATES.md](./OTA_UPDATES.md)

## Files

| File | Purpose |
|------|---------|
| `electron/main/services/updater/index.ts` | `setupAutoUpdater()`, `checkForUpdates()`, `installUpdate()` |
| `electron/main/index.ts` | Calls `setupAutoUpdater()` on ready |
| `src/components/layout/UpdateBanner.tsx` | Top banner when update ready |
| `src/pages/SettingsPage.tsx` | Manual check + install buttons |
| `electron/preload/index.ts` | `onUpdateStatus` listener |
| `package.json` | `build.publish` GitHub config |

## Lifecycle

```
App start (packaged only)
  → setupAutoUpdater()
  → check after 5s, then every 6 hours
  → download if available (autoDownload: true)
  → emit update:status events to renderer
  → user clicks Restart & Install → quitAndInstall()
```

Dev mode (`npm run dev`): updater disabled; message "Updates apply to installed builds only".

## UpdateStatus type

```typescript
interface UpdateStatus {
  checking: boolean
  available: boolean
  downloaded: boolean
  version?: string
  message?: string
}
```

## UI integration

| Component | Behavior |
|-----------|----------|
| `UpdateBanner` | Subscribes to `onUpdateStatus`; shows download/restart CTA |
| Settings → Updates | Manual `checkForUpdates()`, `installUpdate()` |

## Deploy command

```bash
npm run deploy:live   # patch bump + tag + push → GitHub Actions builds release
```

## How to extend

### Beta channel

Wire `settings.updateChannel === 'beta'` to `autoUpdater.channel = 'beta'` in `setupAutoUpdater()`. Publish beta releases to separate GitHub prerelease channel.

### In-app changelog

Fetch release notes from GitHub API when `update-available` fires; show in modal before install.

### Private repo updates

Set `GH_TOKEN` in packaged app or use custom update server — see electron-builder publish docs.

## Related docs

- [OTA_UPDATES.md](./OTA_UPDATES.md)
- [SETTINGS.md](./SETTINGS.md)
