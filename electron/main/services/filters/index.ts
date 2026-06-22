import type { AppFilters, Listing } from '@shared/types'

function normalizeKeywords(input?: string[]): string[] {
  return (input ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean)
}

export function applyAppFilters(listings: Listing[], filters: AppFilters): Listing[] {
  const include = normalizeKeywords(filters.includeKeywords)
  const exclude = normalizeKeywords(filters.excludeKeywords)

  return listings.filter((listing) => {
    const title = listing.title.toLowerCase()

    if (include.length > 0 && !include.every((kw) => title.includes(kw))) {
      return false
    }

    if (exclude.some((kw) => title.includes(kw))) {
      return false
    }

    if (filters.minPrice != null && listing.price < filters.minPrice) {
      return false
    }

    if (filters.maxPrice != null && listing.price > filters.maxPrice) {
      return false
    }

    if (filters.minWatchers != null) {
      const count = listing.watcherCount ?? 0
      if (count < filters.minWatchers) return false
    }

    if (filters.sourcePreference === 'ebay' && !listing.ebayUrl) return false
    if (filters.sourcePreference === 'amazon' && !listing.amazonSearchUrl) return false

    return true
  })
}
