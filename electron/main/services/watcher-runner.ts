import type { ScrapeResult, Watcher } from '@shared/types'
import type { DatabaseService } from '../db/database'
import { fetchPicClickListings } from './scraper'
import { applyAppFilters } from './filters'
import { sendDiscordAlert } from './discord'
import { logger } from './logger'

export async function runWatcherJob(
  db: DatabaseService,
  watcher: Watcher,
  sendAlerts = true
): Promise<ScrapeResult> {
  const scrapedAt = new Date().toISOString()

  try {
    const listings = await fetchPicClickListings(watcher)
    const matched = applyAppFilters(listings, watcher.appFilters ?? {})

    const newMatches = matched.filter((listing) => {
      if (watcher.alertOn === 'all_matches') return true
      return !db.hasSeenListing(watcher.id, listing.id)
    })

    let alertsSent = 0
    const settings = db.getSettings()
    const webhookUrl = watcher.discordWebhookUrl || settings.discordWebhookUrl

    for (const listing of newMatches) {
      db.markListingSeen(watcher.id, listing.id)

      if (!sendAlerts || !webhookUrl) continue

      try {
        await sendDiscordAlert(webhookUrl, watcher, listing, settings)
        db.saveAlert({
          watcherId: watcher.id,
          watcherName: watcher.name,
          listingId: listing.id,
          title: listing.title,
          price: listing.price,
          currency: listing.currency,
          ebayUrl: listing.ebayUrl,
          amazonUrl: listing.amazonSearchUrl,
          imageUrl: listing.imageUrl,
          sentAt: new Date().toISOString(),
          discordStatus: 'sent'
        })
        alertsSent++
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown Discord error'
        logger.error(`Alert failed for ${listing.id}: ${message}`)
        db.saveAlert({
          watcherId: watcher.id,
          watcherName: watcher.name,
          listingId: listing.id,
          title: listing.title,
          price: listing.price,
          currency: listing.currency,
          ebayUrl: listing.ebayUrl,
          amazonUrl: listing.amazonSearchUrl,
          imageUrl: listing.imageUrl,
          sentAt: new Date().toISOString(),
          discordStatus: 'failed'
        })
      }
    }

    db.markWatcherChecked(watcher.id)
    logger.info(`Watcher "${watcher.name}": ${newMatches.length} new, ${alertsSent} alerts sent`)

    return {
      watcherId: watcher.id,
      listings,
      matched,
      newMatches,
      alertsSent,
      scrapedAt
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown scrape error'
    db.markWatcherChecked(watcher.id, message)
    logger.error(`Watcher "${watcher.name}" failed: ${message}`)
    return {
      watcherId: watcher.id,
      listings: [],
      matched: [],
      newMatches: [],
      alertsSent: 0,
      scrapedAt,
      error: message
    }
  }
}
