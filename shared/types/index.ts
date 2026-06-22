export type ListingType =
  | 'All'
  | 'Auction'
  | 'AuctionWithoutBids'
  | 'AuctionWithBids'
  | 'BuyItNow'
  | 'BestOfferOnly'

export type SortOption =
  | 'BestMatch'
  | 'StartTimeNewest'
  | 'EndTimeSoonest'
  | 'PricePlusShippingLowest'
  | 'CurrentPriceHighest'
  | 'WatchCountDecreaseSort'

export type ConditionOption = 'NEW' | 'USED' | 'UNSPECIFIED'

export type AlertOn = 'new_listings' | 'all_matches'

export type SourcePreference = 'any' | 'ebay' | 'amazon'

export interface PicClickFilters {
  listingType?: ListingType
  categoryId?: string
  freeShipping?: boolean
  returnsAccepted?: boolean
  endingWithin24h?: boolean
  newWithin7Days?: boolean
  conditions?: ConditionOption[]
  minPrice?: number
  maxPrice?: number
}

export interface AppFilters {
  includeKeywords?: string[]
  excludeKeywords?: string[]
  minPrice?: number
  maxPrice?: number
  minWatchers?: number
  sourcePreference?: SourcePreference
}

export interface Watcher {
  id: string
  name: string
  enabled: boolean
  searchQuery: string
  picclickFilters: PicClickFilters
  appFilters: AppFilters
  sort: SortOption
  pollIntervalMinutes: number
  discordWebhookUrl?: string
  alertOn: AlertOn
  lastCheckedAt?: string
  lastError?: string
  createdAt: string
  updatedAt: string
}

export type CreateWatcherInput = Omit<
  Watcher,
  'id' | 'createdAt' | 'updatedAt' | 'lastCheckedAt' | 'lastError'
>

export type UpdateWatcherInput = Partial<CreateWatcherInput>

export interface Listing {
  id: string
  title: string
  price: number
  currency: string
  listingType?: string
  watcherCount?: number
  imageUrl?: string
  picclickUrl: string
  ebayUrl: string
  amazonSearchUrl?: string
}

export interface ScrapeResult {
  watcherId: string
  listings: Listing[]
  matched: Listing[]
  newMatches: Listing[]
  alertsSent: number
  scrapedAt: string
  error?: string
}

export interface AlertRecord {
  id: string
  watcherId: string
  watcherName: string
  listingId: string
  title: string
  price?: number
  currency: string
  ebayUrl?: string
  amazonUrl?: string
  imageUrl?: string
  sentAt: string
  discordStatus: 'sent' | 'failed'
}

export interface AppSettings {
  discordWebhookUrl: string
  defaultPollIntervalMinutes: number
  includeAmazonLink: boolean
  includeImage: boolean
  updateChannel: 'stable' | 'beta'
  startMinimized: boolean
  theme: 'dark' | 'light' | 'system'
}

export interface UpdateStatus {
  checking: boolean
  available: boolean
  downloaded: boolean
  version?: string
  message?: string
}

export interface DashboardStats {
  totalWatchers: number
  activeWatchers: number
  alertsToday: number
  lastAlertAt?: string
}

export interface LogEntry {
  level: string
  message: string
  timestamp: string
}

declare global {
  interface Window {
    api: {
      watchers: {
        list(): Promise<Watcher[]>
        get(id: string): Promise<Watcher | null>
        create(data: CreateWatcherInput): Promise<Watcher>
        update(id: string, data: UpdateWatcherInput): Promise<Watcher>
        delete(id: string): Promise<void>
        runNow(id: string, sendAlerts?: boolean): Promise<ScrapeResult>
      }
      alerts: {
        list(limit?: number): Promise<AlertRecord[]>
      }
      settings: {
        get(): Promise<AppSettings>
        update(data: Partial<AppSettings>): Promise<AppSettings>
        testDiscord(webhookUrl?: string): Promise<void>
      }
      app: {
        getVersion(): Promise<string>
        getStats(): Promise<DashboardStats>
        checkForUpdates(): Promise<UpdateStatus>
        installUpdate(): Promise<void>
        openExternal(url: string): Promise<void>
        getPlatform(): Promise<NodeJS.Platform>
      }
      window: {
        minimize(): Promise<void>
        maximize(): Promise<void>
        close(): Promise<void>
        isMaximized(): Promise<boolean>
        onMaximizedChange(callback: (maximized: boolean) => void): () => void
      }
      logs: {
        tail(limit?: number): Promise<LogEntry[]>
      }
      onUpdateStatus(callback: (status: UpdateStatus) => void): () => void
      onWatcherUpdated(callback: (watcher: Watcher) => void): () => void
    }
  }
}

export {}
