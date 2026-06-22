import cron from 'node-cron'
import type { BrowserWindow } from 'electron'
import type { DatabaseService } from '../db/database'
import type { Watcher } from '@shared/types'
import { runWatcherJob } from '../watcher-runner'
import { logger } from '../logger'

class SimpleQueue {
  private running = 0
  private readonly queue: Array<() => Promise<void>> = []

  constructor(private readonly concurrency: number) {}

  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn())
        } catch (err) {
          reject(err)
        }
      })
      void this.runNext()
    })
  }

  private async runNext(): Promise<void> {
    if (this.running >= this.concurrency || this.queue.length === 0) return
    this.running++
    const job = this.queue.shift()!
    try {
      await job()
    } finally {
      this.running--
      void this.runNext()
    }
  }
}

export class SchedulerService {
  private tasks = new Map<string, cron.ScheduledTask>()
  private queue = new SimpleQueue(2)
  private getWindow: () => BrowserWindow | null

  constructor(
    private db: DatabaseService,
    getWindow: () => BrowserWindow | null
  ) {
    this.getWindow = getWindow
  }

  start(): void {
    this.refreshAll()
    logger.info('Scheduler started')
  }

  stop(): void {
    for (const task of this.tasks.values()) {
      task.stop()
    }
    this.tasks.clear()
  }

  refreshAll(): void {
    this.stop()
    const watchers = this.db.listWatchers().filter((w) => w.enabled)
    for (const watcher of watchers) {
      this.scheduleWatcher(watcher)
    }
  }

  scheduleWatcher(watcher: Watcher): void {
    const existing = this.tasks.get(watcher.id)
    if (existing) existing.stop()

    if (!watcher.enabled) return

    const minutes = Math.max(1, watcher.pollIntervalMinutes)
    const cronExpr = `*/${minutes} * * * *`

    const task = cron.schedule(cronExpr, () => {
      void this.queue.add(async () => {
        const fresh = this.db.getWatcher(watcher.id)
        if (!fresh?.enabled) return
        const result = await runWatcherJob(this.db, fresh, true)
        this.notifyWatcherUpdated(fresh.id)
        if (result.newMatches.length > 0) {
          logger.info(`New matches for ${fresh.name}: ${result.newMatches.length}`)
        }
      })
    })

    this.tasks.set(watcher.id, task)
    logger.info(`Scheduled "${watcher.name}" every ${minutes} min`)
  }

  unscheduleWatcher(id: string): void {
    const task = this.tasks.get(id)
    if (task) {
      task.stop()
      this.tasks.delete(id)
    }
  }

  async runNow(watcherId: string, sendAlerts = true) {
    const watcher = this.db.getWatcher(watcherId)
    if (!watcher) throw new Error('Watcher not found')
    const result = await this.queue.add(() => runWatcherJob(this.db, watcher, sendAlerts))
    this.notifyWatcherUpdated(watcherId)
    return result
  }

  private notifyWatcherUpdated(id: string): void {
    const win = this.getWindow()
    const watcher = this.db.getWatcher(id)
    if (win && watcher) {
      win.webContents.send('watcher:updated', watcher)
    }
  }
}
