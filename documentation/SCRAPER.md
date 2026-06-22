# Scraper

## Problem it solves

The app must fetch PicClick search results programmatically and extract structured listing data (title, price, eBay link, image) without an official PicClick API.

## How it solves it

HTTP GET to a constructed PicClick URL → Cheerio HTML parse → array of `Listing` objects.

PicClick embeds listings server-side as `<li id="item-{ebayItemId}">` elements, so no headless browser is required for the current page structure.

## Files

| File | Functions | Purpose |
|------|-----------|---------|
| `electron/main/services/scraper/index.ts` | `fetchPicClickListings()` | HTTP fetch with timeout, User-Agent |
| `electron/main/services/scraper/parser.ts` | `parseListings()` | Cheerio DOM extraction |
| `electron/main/services/scraper/url-builder.ts` | `buildPicClickUrl()` | Watcher → PicClick URL |

## fetchPicClickListings(watcher)

1. Calls `buildPicClickUrl(watcher)`
2. `fetch()` with 20s timeout, browser-like headers
3. Passes HTML to `parseListings()`
4. Returns `Listing[]`
5. Logs warning if 0 listings parsed (possible HTML change)

## parseListings(html)

Extracts from each `li[id^="item-"]`:

| Field | Selector / logic |
|-------|------------------|
| `id` | `id="item-{ebayId}"` |
| `title` | `h3[title]`, `h3` text, or `img[title]` |
| `price` | `.price strong` → regex parse |
| `listingType` | `.price small` |
| `watcherCount` | `.watchcount` → digit regex |
| `imageUrl` | `picture source[webp]` or `img[src]` |
| `picclickUrl` | First `a[href]` |
| `ebayUrl` | `https://www.ebay.com/itm/{id}` |
| `amazonSearchUrl` | Built from title keywords |

## buildPicClickUrl(watcher)

Base: `https://picclick.com/?q={searchQuery}`

Appends query params from `watcher.picclickFilters` and `watcher.sort`. See [WATCHERS.md](./WATCHERS.md) for param table.

Exported constants for UI dropdowns: `SORT_OPTIONS`, `LISTING_TYPE_OPTIONS`, `CATEGORY_OPTIONS`.

## Called by

- `runWatcherJob()` in `watcher-runner.ts` (scheduled + manual runs)

## How to extend

### PicClick changes HTML structure

1. Fetch a sample page: `curl "https://picclick.com/?q=test" > sample.html`
2. Update selectors in `parser.ts`
3. Add fixture HTML under `test/fixtures/` for regression tests

### Add pagination

1. Detect next-page link or `?page=` param in PicClick HTML
2. Loop in `fetchPicClickListings()` with max pages cap
3. Merge listing arrays before return

### Add Playwright fallback

If PicClick serves empty shell without JS:

1. Add optional `playwright-core` fetch path in `scraper/index.ts`
2. Toggle via setting or auto-detect zero listings

### Scrape additional fields (seller, condition)

Inspect listing tile HTML; add fields to `Listing` interface and parser selectors.

## Related docs

- [WATCHERS.md](./WATCHERS.md)
- [FILTERS.md](./FILTERS.md)
