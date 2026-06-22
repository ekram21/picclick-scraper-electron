import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  CreateWatcherInput,
  UpdateStatus,
  UpdateWatcherInput,
  Watcher
} from '@shared/types'

const api = {
  watchers: {
    list: (): Promise<Watcher[]> => ipcRenderer.invoke('watchers:list'),
    get: (id: string): Promise<Watcher | null> => ipcRenderer.invoke('watchers:get', id),
    create: (data: CreateWatcherInput): Promise<Watcher> =>
      ipcRenderer.invoke('watchers:create', data),
    update: (id: string, data: UpdateWatcherInput): Promise<Watcher> =>
      ipcRenderer.invoke('watchers:update', id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('watchers:delete', id),
    runNow: (id: string, sendAlerts?: boolean) =>
      ipcRenderer.invoke('watchers:runNow', id, sendAlerts)
  },
  alerts: {
    list: (limit?: number) => ipcRenderer.invoke('alerts:list', limit)
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    update: (data: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:update', data),
    testDiscord: (webhookUrl?: string): Promise<void> =>
      ipcRenderer.invoke('settings:testDiscord', webhookUrl)
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
    getStats: () => ipcRenderer.invoke('app:getStats'),
    checkForUpdates: (): Promise<UpdateStatus> => ipcRenderer.invoke('app:checkForUpdates'),
    getUpdateStatus: (): Promise<UpdateStatus> => ipcRenderer.invoke('app:getUpdateStatus'),
    installUpdate: (): Promise<void> => ipcRenderer.invoke('app:installUpdate'),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('app:openExternal', url),
    getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:getPlatform')
  },
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void) => {
      const handler = (_: unknown, maximized: boolean) => callback(maximized)
      ipcRenderer.on('window:maximized', handler)
      return () => ipcRenderer.removeListener('window:maximized', handler)
    }
  },
  logs: {
    tail: (limit?: number) => ipcRenderer.invoke('logs:tail', limit)
  },
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const handler = (_: unknown, status: UpdateStatus) => callback(status)
    ipcRenderer.on('update:status', handler)
    return () => ipcRenderer.removeListener('update:status', handler)
  },
  onWatcherUpdated: (callback: (watcher: Watcher) => void) => {
    const handler = (_: unknown, watcher: Watcher) => callback(watcher)
    ipcRenderer.on('watcher:updated', handler)
    return () => ipcRenderer.removeListener('watcher:updated', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
