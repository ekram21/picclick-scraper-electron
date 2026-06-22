import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { DatabaseService } from './db/database'
import { SchedulerService } from './services/scheduler'
import { registerIpc } from './ipc'
import { setupAutoUpdater } from './services/updater'
import { logger } from './services/logger'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let db: DatabaseService
let scheduler: SchedulerService

const isDev = !app.isPackaged

function getIconPath(): string {
  const candidates = [
    join(process.cwd(), 'resources/icon.png'),
    join(__dirname, '../../resources/icon.png'),
    join(process.resourcesPath, 'icon.png')
  ]
  return candidates.find((p) => existsSync(p)) ?? candidates[0]
}

function getAppIcon() {
  return nativeImage.createFromPath(getIconPath())
}

function createWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin'
  const icon = getAppIcon()

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    icon: icon.isEmpty() ? undefined : icon,
    frame: isMac ? undefined : false,
    titleBarStyle: isMac ? 'hidden' : undefined,
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    roundedCorners: !isMac,
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized', false)
  })

  mainWindow.on('close', (e) => {
    if (!(app as typeof app & { isQuitting?: boolean }).isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function createTray(): void {
  const icon = getAppIcon()
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 18, height: 18 }))
  tray.setToolTip('PicClick Watcher')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open PicClick Watcher',
      click: () => mainWindow?.show()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        ;(app as typeof app & { isQuitting?: boolean }).isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow?.show())
}

app.whenReady().then(() => {
  db = new DatabaseService()
  createWindow()
  createTray()

  if (process.platform === 'darwin') {
    const icon = getAppIcon()
    if (!icon.isEmpty()) {
      app.dock?.setIcon(icon)
    }
  }

  scheduler = new SchedulerService(db, () => mainWindow)
  registerIpc(db, scheduler, () => mainWindow)
  scheduler.start()
  setupAutoUpdater()

  logger.info('PicClick Watcher started')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  ;(app as typeof app & { isQuitting?: boolean }).isQuitting = true
  scheduler?.stop()
  db?.close()
})

app.setAsDefaultProtocolClient('picclick-watcher')

app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
})
