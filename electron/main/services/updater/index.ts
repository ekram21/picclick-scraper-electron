import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '@shared/types'
import { logger } from '../logger'

let currentStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloaded: false
}

export function getUpdateStatus(): UpdateStatus {
  return currentStatus
}

function formatUpdateError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)

  if (
    raw.includes('ERR_UPDATER_CHANNEL_FILE_NOT_FOUND') ||
    raw.includes('Cannot find latest-mac.yml') ||
    raw.includes('Cannot find latest.yml')
  ) {
    return 'Update metadata missing on GitHub release (latest-mac.yml / latest.yml). Republish the release from CI.'
  }

  if (raw.includes('404') && raw.includes('/download/')) {
    return 'Update found but download failed — release file names on GitHub do not match. Install manually from GitHub Releases or wait for the next release.'
  }

  // Private GitHub repos return 404 without auth
  if (
    raw.includes('404') &&
    (raw.includes('releases.atom') || raw.includes('Unable to find latest version on GitHub'))
  ) {
    return 'No published releases found yet. Ship the first release with npm run deploy:live. If the repo is private, make it public for OTA updates to work.'
  }

  if (raw.includes('403') || raw.toLowerCase().includes('authentication')) {
    return 'Cannot reach GitHub Releases. If the repository is private, make it public or use a custom update server.'
  }

  if (raw.includes('net::') || raw.includes('ENOTFOUND') || raw.includes('network')) {
    return 'Update check failed — check your internet connection and try again.'
  }

  // electron-updater sometimes embeds huge JSON response bodies in the message
  if (raw.length > 120) {
    return 'Update check failed. No release may be published yet, or GitHub Releases is unreachable.'
  }

  return `Update check failed: ${raw}`
}

function broadcast(status: Partial<UpdateStatus>): void {
  currentStatus = { ...currentStatus, ...status }
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:status', currentStatus)
  }
}

export function setupAutoUpdater(): void {
  if (!app.isPackaged) {
    logger.info('Auto-updater disabled in development')
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null // suppress verbose updater logs in console

  autoUpdater.on('checking-for-update', () => {
    broadcast({ checking: true, message: 'Checking for updates…' })
  })

  autoUpdater.on('update-available', (info) => {
    broadcast({
      checking: false,
      available: true,
      version: info.version,
      message: `Update v${info.version} available — downloading…`
    })
  })

  autoUpdater.on('update-not-available', () => {
    broadcast({
      checking: false,
      available: false,
      downloaded: false,
      message: 'You are on the latest version'
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    broadcast({
      message: `Downloading update… ${Math.round(progress.percent)}%`
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    broadcast({
      downloaded: true,
      version: info.version,
      message: `Update v${info.version} ready — restart to install`
    })
  })

  autoUpdater.on('error', (err) => {
    const message = formatUpdateError(err)
    logger.error(`Auto-updater error: ${message}`)
    broadcast({
      checking: false,
      available: false,
      downloaded: false,
      message
    })
  })

  // Check on startup and every 6 hours
  setTimeout(() => void checkForUpdates(), 5000)
  setInterval(() => void checkForUpdates(), 6 * 60 * 60 * 1000)
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!app.isPackaged) {
    const status: UpdateStatus = {
      checking: false,
      available: false,
      downloaded: false,
      message: 'Updates apply to installed builds only'
    }
    broadcast(status)
    return status
  }

  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    const message = formatUpdateError(err)
    broadcast({ checking: false, available: false, downloaded: false, message })
  }

  return currentStatus
}

export function installUpdate(): void {
  if (app.isPackaged && currentStatus.downloaded) {
    autoUpdater.quitAndInstall()
  }
}
