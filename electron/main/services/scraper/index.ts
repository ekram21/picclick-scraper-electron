import type { Listing, Watcher } from '@shared/types'
import { buildPicClickUrl } from './url-builder'
import { parseListings } from './parser'
import { logger } from '../logger'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export async function fetchPicClickListings(watcher: Watcher): Promise<Listing[]> {
  const url = buildPicClickUrl(watcher)
  logger.info(`Fetching PicClick: ${url}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`PicClick returned HTTP ${response.status}`)
    }

    const html = await response.text()
    const listings = parseListings(html)

    if (listings.length === 0) {
      logger.warn(`No listings parsed for watcher "${watcher.name}" — page structure may have changed`)
    } else {
      logger.info(`Parsed ${listings.length} listings for "${watcher.name}"`)
    }

    return listings
  } finally {
    clearTimeout(timeout)
  }
}
