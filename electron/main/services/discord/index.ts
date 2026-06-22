import type { AppSettings, Listing, Watcher } from '@shared/types'
import { logger } from '../logger'

export async function sendDiscordAlert(
  webhookUrl: string,
  watcher: Watcher,
  listing: Listing,
  settings: AppSettings
): Promise<void> {
  const links: string[] = [`[View on eBay](${listing.ebayUrl})`]
  if (settings.includeAmazonLink && listing.amazonSearchUrl) {
    links.push(`[Search Amazon](${listing.amazonSearchUrl})`)
  }

  const fields = [
    { name: 'Price', value: `$${listing.price.toFixed(2)}${listing.listingType ? ` · ${listing.listingType}` : ''}`, inline: true }
  ]

  if (listing.watcherCount != null) {
    fields.push({ name: 'Watchers', value: String(listing.watcherCount), inline: true })
  }

  fields.push({ name: 'Links', value: links.join(' · '), inline: false })

  const embed: Record<string, unknown> = {
    title: '🃏 New Match',
    description: listing.title,
    color: 0x10b981,
    fields: [
      { name: 'Watcher', value: watcher.name, inline: true },
      ...fields
    ],
    footer: { text: 'PicClick Watcher' },
    timestamp: new Date().toISOString()
  }

  if (settings.includeImage && listing.imageUrl) {
    embed.thumbnail = { url: listing.imageUrl }
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'PicClick Watcher',
      embeds: [embed]
    })
  })

  if (!response.ok) {
    const body = await response.text()
    logger.error(`Discord webhook failed: ${response.status} ${body}`)
    throw new Error(`Discord webhook failed (${response.status})`)
  }
}

export async function sendTestDiscord(webhookUrl: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'PicClick Watcher',
      embeds: [
        {
          title: '✅ Webhook Connected',
          description: 'PicClick Watcher is ready to send listing alerts.',
          color: 0x6366f1,
          timestamp: new Date().toISOString()
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`Discord test failed (${response.status})`)
  }
}
