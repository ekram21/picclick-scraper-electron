import type { PicClickFilters, SortOption, Watcher } from '@shared/types'

const BASE_URL = 'https://picclick.com/'

export function buildPicClickUrl(watcher: Pick<Watcher, 'searchQuery' | 'picclickFilters' | 'sort'>): string {
  const params = new URLSearchParams()
  params.set('q', watcher.searchQuery)

  const filters = watcher.picclickFilters ?? {}

  if (filters.listingType && filters.listingType !== 'All') {
    params.set('type', filters.listingType)
  }
  if (filters.categoryId) {
    params.set('categoryId', filters.categoryId)
  }
  if (filters.freeShipping) {
    params.set('FreeShippingOnly', 'true')
  }
  if (filters.returnsAccepted) {
    params.set('ReturnsAcceptedOnly', 'true')
  }
  if (filters.endingWithin24h) {
    params.set('EndTimeTo', 'true')
  }
  if (filters.newWithin7Days) {
    params.set('StartTimeFrom', 'true')
  }
  if (filters.minPrice != null) {
    params.set('MinPrice', String(filters.minPrice))
  }
  if (filters.maxPrice != null) {
    params.set('MaxPrice', String(filters.maxPrice))
  }
  if (filters.conditions?.length) {
    for (const condition of filters.conditions) {
      params.append('Condition', condition)
    }
  }
  if (watcher.sort && watcher.sort !== 'BestMatch') {
    params.set('sort', watcher.sort)
  }

  return `${BASE_URL}?${params.toString()}`
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'BestMatch', label: 'Best Match' },
  { value: 'StartTimeNewest', label: 'Newly Listed' },
  { value: 'EndTimeSoonest', label: 'Ending Soon' },
  { value: 'PricePlusShippingLowest', label: 'Price Lowest' },
  { value: 'CurrentPriceHighest', label: 'Price Highest' },
  { value: 'WatchCountDecreaseSort', label: 'Most Watched' }
]

export const LISTING_TYPE_OPTIONS = [
  { value: 'All', label: 'All Listings' },
  { value: 'Auction', label: 'Auctions' },
  { value: 'AuctionWithoutBids', label: 'Auctions without Bids' },
  { value: 'AuctionWithBids', label: 'Auctions with Bids' },
  { value: 'BuyItNow', label: 'Buy It Now' },
  { value: 'BestOfferOnly', label: 'Accepts Offers' }
] as const

export const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: '212', label: 'Sports Trading Cards' },
  { value: '64482', label: 'Sports Mem, Cards & Fan Shop' },
  { value: '1', label: 'Collectibles' },
  { value: '262343', label: 'Sports Stickers, Collections & Albums' }
]

export type { PicClickFilters }
