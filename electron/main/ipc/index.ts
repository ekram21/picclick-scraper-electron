import { ipcMain, shell } from 'electron'
import type { BrowserWindow } from 'electron'
import type { DatabaseService } from '../db/database'
import type { SchedulerService } from '../services/scheduler'
import type { CreateWatcherInput, UpdateWatcherInput } from '@shared/types'
import { getRecentLogs } from '../services/logger'
import {
  checkForUpdates,
  getUpdateStatus,
  installUpdate
} from '../services/updater'
import { sendTestDiscord } from '../services/discord'

export function registerIpc(
  db: DatabaseService,
  scheduler: SchedulerService,
  getWindow: () => BrowserWindow | null
): void {
  ipcMain.handle('watchers:list', () => db.listWatchers())

  ipcMain.handle('watchers:get', (_e, id: string) => db.getWatcher(id))

  ipcMain.handle('watchers:create', (_e, data: CreateWatcherInput) => {
    const watcher = db.createWatcher(data)
    scheduler.scheduleWatcher(watcher)
    return watcher
  })

  ipcMain.handle('watchers:update', (_e, id: string, data: UpdateWatcherInput) => {
    const watcher = db.updateWatcher(id, data)
    scheduler.scheduleWatcher(watcher)
    return watcher
  })

  ipcMain.handle('watchers:delete', (_e, id: string) => {
    scheduler.unscheduleWatcher(id)
    db.deleteWatcher(id)
  })

  ipcMain.handle('watchers:runNow', (_e, id: string, sendAlerts = true) =>
    scheduler.runNow(id, sendAlerts)
  )

  ipcMain.handle('alerts:list', (_e, limit = 50) => db.listAlerts(limit))

  ipcMain.handle('settings:get', () => db.getSettings())

  ipcMain.handle('settings:update', (_e, data) => db.updateSettings(data))

  ipcMain.handle('settings:testDiscord', async (_e, webhookUrl?: string) => {
    const settings = db.getSettings()
    const url = webhookUrl || settings.discordWebhookUrl
    if (!url) throw new Error('Discord webhook URL is not configured')
    await sendTestDiscord(url)
  })

  ipcMain.handle('app:getVersion', () => {
    const { app } = require('electron') as typeof import('electron')
    return app.getVersion()
  })

  ipcMain.handle('app:getStats', () => db.getStats())

  ipcMain.handle('app:checkForUpdates', () => checkForUpdates())

  ipcMain.handle('app:getUpdateStatus', () => getUpdateStatus())

  ipcMain.handle('app:installUpdate', () => installUpdate())

  ipcMain.handle('app:openExternal', (_e, url: string) => shell.openExternal(url))

  ipcMain.handle('app:getPlatform', () => process.platform)

  ipcMain.handle('window:minimize', () => {
    getWindow()?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    const win = getWindow()
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.handle('window:close', () => {
    getWindow()?.close()
  })

  ipcMain.handle('window:isMaximized', () => getWindow()?.isMaximized() ?? false)

  ipcMain.handle('logs:tail', (_e, limit = 100) => getRecentLogs(limit))
}
