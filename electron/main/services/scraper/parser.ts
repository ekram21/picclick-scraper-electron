import * as cheerio from 'cheerio'
import type { Listing } from '@shared/types'

function parsePrice(text: string): { price: number; currency: string } {
  const cleaned = text.replace(/,/g, '').trim()
  const match = cleaned.match(/([$€£])?\s*([\d.]+)/)
  if (!match) return { price: 0, currency: 'USD' }
  const symbol = match[1] ?? '$'
  const currency = symbol === '€' ? 'EUR' : symbol === '£' ? 'GBP' : 'USD'
  return { price: parseFloat(match[2]), currency }
}

function buildAmazonSearchUrl(title: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(title.slice(0, 120))}`
}

export function parseListings(html: string, baseUrl = 'https://picclick.com'): Listing[] {
  const $ = cheerio.load(html)
  const listings: Listing[] = []

  $('li[id^="item-"]').each((_, el) => {
    const $el = $(el)
    const idAttr = $el.attr('id') ?? ''
    const listingId = idAttr.replace('item-', '')
    if (!listingId) return

    const link = $el.find('a[href]').first()
    const href = link.attr('href') ?? ''
    const picclickUrl = href.startsWith('http') ? href : `${baseUrl}${href}`

    const title =
      $el.find('h3').attr('title') ||
      $el.find('h3').text().trim() ||
      $el.find('img').attr('title') ||
      $el.find('img').attr('alt') ||
      'Unknown listing'

    const priceText = $el.find('.price strong').text().trim()
    const { price, currency } = parsePrice(priceText)
    const listingType = $el.find('.price small').text().trim() || undefined

    const watchText = $el.find('.watchcount').text().trim()
    const watcherMatch = watchText.match(/(\d+)/)
    const watcherCount = watcherMatch ? parseInt(watcherMatch[1], 10) : undefined

    const imageUrl =
      $el.find('picture source[type="image/webp"]').attr('srcset') ||
      $el.find('picture img').attr('src') ||
      $el.find('img').attr('src') ||
      undefined

    listings.push({
      id: listingId,
      title: title.replace(/\s+/g, ' ').trim(),
      price,
      currency,
      listingType,
      watcherCount,
      imageUrl,
      picclickUrl,
      ebayUrl: `https://www.ebay.com/itm/${listingId}`,
      amazonSearchUrl: buildAmazonSearchUrl(title)
    })
  })

  return listings
}
