import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import type {
  AlertRecord,
  AppSettings,
  CreateWatcherInput,
  UpdateWatcherInput,
  Watcher
} from '@shared/types'
import { v4 as uuidv4 } from 'uuid'

const DEFAULT_SETTINGS: AppSettings = {
  discordWebhookUrl: '',
  defaultPollIntervalMinutes: 5,
  includeAmazonLink: true,
  includeImage: true,
  updateChannel: 'stable',
  startMinimized: false,
  theme: 'dark'
}

export class DatabaseService {
  private db: Database.Database

  constructor() {
    const dir = app.getPath('userData')
    mkdirSync(dir, { recursive: true })
    this.db = new Database(join(dir, 'watcher.db'))
    this.db.pragma('journal_mode = WAL')
    this.migrate()
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS watchers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        search_query TEXT NOT NULL,
        picclick_filters_json TEXT NOT NULL DEFAULT '{}',
        app_filters_json TEXT NOT NULL DEFAULT '{}',
        sort TEXT NOT NULL DEFAULT 'BestMatch',
        poll_interval_minutes INTEGER NOT NULL DEFAULT 5,
        discord_webhook_url TEXT,
        alert_on TEXT NOT NULL DEFAULT 'new_listings',
        last_checked_at TEXT,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS seen_listings (
        watcher_id TEXT NOT NULL,
        listing_id TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        PRIMARY KEY (watcher_id, listing_id)
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        watcher_id TEXT NOT NULL,
        watcher_name TEXT NOT NULL,
        listing_id TEXT NOT NULL,
        title TEXT NOT NULL,
        price REAL,
        currency TEXT DEFAULT 'USD',
        ebay_url TEXT,
        amazon_url TEXT,
        image_url TEXT,
        sent_at TEXT NOT NULL,
        discord_status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `)
  }

  private rowToWatcher(row: Record<string, unknown>): Watcher {
    return {
      id: row.id as string,
      name: row.name as string,
      enabled: Boolean(row.enabled),
      searchQuery: row.search_query as string,
      picclickFilters: JSON.parse((row.picclick_filters_json as string) || '{}'),
      appFilters: JSON.parse((row.app_filters_json as string) || '{}'),
      sort: row.sort as Watcher['sort'],
      pollIntervalMinutes: row.poll_interval_minutes as number,
      discordWebhookUrl: (row.discord_webhook_url as string) || undefined,
      alertOn: row.alert_on as Watcher['alertOn'],
      lastCheckedAt: (row.last_checked_at as string) || undefined,
      lastError: (row.last_error as string) || undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string
    }
  }

  listWatchers(): Watcher[] {
    const rows = this.db.prepare('SELECT * FROM watchers ORDER BY created_at DESC').all()
    return rows.map((r) => this.rowToWatcher(r as Record<string, unknown>))
  }

  getWatcher(id: string): Watcher | null {
    const row = this.db.prepare('SELECT * FROM watchers WHERE id = ?').get(id)
    return row ? this.rowToWatcher(row as Record<string, unknown>) : null
  }

  createWatcher(data: CreateWatcherInput): Watcher {
    const now = new Date().toISOString()
    const id = uuidv4()
    this.db
      .prepare(
        `INSERT INTO watchers (
          id, name, enabled, search_query, picclick_filters_json, app_filters_json,
          sort, poll_interval_minutes, discord_webhook_url, alert_on, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        data.name,
        data.enabled ? 1 : 0,
        data.searchQuery,
        JSON.stringify(data.picclickFilters ?? {}),
        JSON.stringify(data.appFilters ?? {}),
        data.sort,
        data.pollIntervalMinutes,
        data.discordWebhookUrl ?? null,
        data.alertOn,
        now,
        now
      )
    return this.getWatcher(id)!
  }

  updateWatcher(id: string, data: UpdateWatcherInput): Watcher {
    const existing = this.getWatcher(id)
    if (!existing) throw new Error('Watcher not found')

    const updated: Watcher = {
      ...existing,
      ...data,
      picclickFilters: data.picclickFilters ?? existing.picclickFilters,
      appFilters: data.appFilters ?? existing.appFilters,
      updatedAt: new Date().toISOString()
    }

    this.db
      .prepare(
        `UPDATE watchers SET
          name = ?, enabled = ?, search_query = ?, picclick_filters_json = ?,
          app_filters_json = ?, sort = ?, poll_interval_minutes = ?,
          discord_webhook_url = ?, alert_on = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        updated.name,
        updated.enabled ? 1 : 0,
        updated.searchQuery,
        JSON.stringify(updated.picclickFilters),
        JSON.stringify(updated.appFilters),
        updated.sort,
        updated.pollIntervalMinutes,
        updated.discordWebhookUrl ?? null,
        updated.alertOn,
        updated.updatedAt,
        id
      )

    return this.getWatcher(id)!
  }

  deleteWatcher(id: string): void {
    this.db.prepare('DELETE FROM seen_listings WHERE watcher_id = ?').run(id)
    this.db.prepare('DELETE FROM alerts WHERE watcher_id = ?').run(id)
    this.db.prepare('DELETE FROM watchers WHERE id = ?').run(id)
  }

  markWatcherChecked(id: string, error?: string): void {
    this.db
      .prepare('UPDATE watchers SET last_checked_at = ?, last_error = ? WHERE id = ?')
      .run(new Date().toISOString(), error ?? null, id)
  }

  hasSeenListing(watcherId: string, listingId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM seen_listings WHERE watcher_id = ? AND listing_id = ?')
      .get(watcherId, listingId)
    return Boolean(row)
  }

  markListingSeen(watcherId: string, listingId: string): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO seen_listings (watcher_id, listing_id, first_seen_at) VALUES (?, ?, ?)'
      )
      .run(watcherId, listingId, new Date().toISOString())
  }

  saveAlert(alert: Omit<AlertRecord, 'id'>): AlertRecord {
    const record: AlertRecord = { ...alert, id: uuidv4() }
    this.db
      .prepare(
        `INSERT INTO alerts (
          id, watcher_id, watcher_name, listing_id, title, price, currency,
          ebay_url, amazon_url, image_url, sent_at, discord_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        record.watcherId,
        record.watcherName,
        record.listingId,
        record.title,
        record.price ?? null,
        record.currency,
        record.ebayUrl ?? null,
        record.amazonUrl ?? null,
        record.imageUrl ?? null,
        record.sentAt,
        record.discordStatus
      )
    return record
  }

  listAlerts(limit = 50): AlertRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM alerts ORDER BY sent_at DESC LIMIT ?')
      .all(limit)
    return rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: r.id as string,
        watcherId: r.watcher_id as string,
        watcherName: r.watcher_name as string,
        listingId: r.listing_id as string,
        title: r.title as string,
        price: r.price as number | undefined,
        currency: (r.currency as string) || 'USD',
        ebayUrl: (r.ebay_url as string) || undefined,
        amazonUrl: (r.amazon_url as string) || undefined,
        imageUrl: (r.image_url as string) || undefined,
        sentAt: r.sent_at as string,
        discordStatus: r.discord_status as AlertRecord['discordStatus']
      }
    })
  }

  getStats(): { totalWatchers: number; activeWatchers: number; alertsToday: number; lastAlertAt?: string } {
    const total = this.db.prepare('SELECT COUNT(*) as c FROM watchers').get() as { c: number }
    const active = this.db
      .prepare('SELECT COUNT(*) as c FROM watchers WHERE enabled = 1')
      .get() as { c: number }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const alertsToday = this.db
      .prepare('SELECT COUNT(*) as c FROM alerts WHERE sent_at >= ?')
      .get(today.toISOString()) as { c: number }
    const last = this.db
      .prepare('SELECT sent_at FROM alerts ORDER BY sent_at DESC LIMIT 1')
      .get() as { sent_at: string } | undefined

    return {
      totalWatchers: total.c,
      activeWatchers: active.c,
      alertsToday: alertsToday.c,
      lastAlertAt: last?.sent_at
    }
  }

  getSettings(): AppSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as Array<{
      key: string
      value: string
    }>
    const settings = { ...DEFAULT_SETTINGS }
    for (const row of rows) {
      ;(settings as Record<string, unknown>)[row.key] = JSON.parse(row.value)
    }
    return settings
  }

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    const current = this.getSettings()
    const next = { ...current, ...partial }
    const stmt = this.db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    for (const [key, value] of Object.entries(partial)) {
      stmt.run(key, JSON.stringify(value))
    }
    return next
  }

  close(): void {
    this.db.close()
  }
}
