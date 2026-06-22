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
    logger.error(`Auto-updater error: ${err.message}`)
    broadcast({
      checking: false,
      message: `Update check failed: ${err.message}`
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
    const message = err instanceof Error ? err.message : 'Update check failed'
    broadcast({ checking: false, message })
  }

  return currentStatus
}

export function installUpdate(): void {
  if (app.isPackaged && currentStatus.downloaded) {
    autoUpdater.quitAndInstall()
  }
}
