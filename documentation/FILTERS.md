# Filters

## Problem it solves

PicClick URL params cover many filters, but users also need precise control after scraping — keyword include/exclude, price bounds, minimum watcher count — that may not map cleanly to PicClick query params.

## How it solves it

Two filter layers:

1. **PicClick filters** — applied server-side via URL (`picclickFilters` → `buildPicClickUrl()`)
2. **App filters** — applied client-side after parse (`appFilters` → `applyAppFilters()`)

## Files

| File | Function | Layer |
|------|----------|-------|
| `electron/main/services/scraper/url-builder.ts` | `buildPicClickUrl()` | PicClick |
| `electron/main/services/filters/index.ts` | `applyAppFilters()` | App |
| `src/pages/WatcherFormPage.tsx` | Form tabs | UI for both |
| `shared/types/index.ts` | `PicClickFilters`, `AppFilters` | Types |

## applyAppFilters(listings, filters)

Returns filtered subset. Rules (all must pass):

| Rule | Logic |
|------|-------|
| `includeKeywords` | Every keyword must appear in title (case-insensitive) |
| `excludeKeywords` | No keyword may appear in title |
| `minPrice` / `maxPrice` | Listing price bounds |
| `minWatchers` | `listing.watcherCount >= min` |
| `sourcePreference` | `'ebay'` requires `ebayUrl`; `'amazon'` requires `amazonSearchUrl` |

Empty keyword arrays = no restriction.

## PicClickFilters (URL-level)

Configured in Watcher Form → **PicClick Filters** tab. Serialized to JSON in `watchers.picclick_filters_json`.

See [WATCHERS.md](./WATCHERS.md) and [SCRAPER.md](./SCRAPER.md) for URL param mapping.

## How to extend

### New app filter (e.g. max watchers)

1. Add to `AppFilters` interface
2. Add check in `applyAppFilters()` loop
3. Add input in WatcherFormPage → App Filters tab

### Regex title matching

Replace `includes()` with `RegExp` test; add `titleRegex?: string` to `AppFilters`.

### Filter presets

Store named presets in new SQLite table; load into form via dropdown.

### Category-specific PicClick aspects

PicClick has many aspect filters (Team, Player, etc.) as checkbox params. Reverse-engineer param names from PicClick HTML and add to `buildPicClickUrl()`.

## Related docs

- [WATCHERS.md](./WATCHERS.md)
- [SCRAPER.md](./SCRAPER.md)
