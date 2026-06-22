# Discord integration

## Problem it solves

Users want instant notifications in a Discord channel when a matching listing appears, with enough context to decide quickly (title, price, image, links).

## How it solves it

Discord **Incoming Webhooks** — simple HTTPS POST with JSON embed payload. No bot token or OAuth required.

## Files

| File | Functions | Purpose |
|------|-----------|---------|
| `electron/main/services/discord/index.ts` | `sendDiscordAlert()`, `sendTestDiscord()` | Webhook HTTP calls |
| `electron/main/services/watcher-runner.ts` | Alert loop | Calls `sendDiscordAlert` per new match |
| `electron/main/ipc/index.ts` | `settings:testDiscord` | Test button in Settings |
| `src/pages/SettingsPage.tsx` | Test + webhook URL form | User configuration |

## sendDiscordAlert(webhookUrl, watcher, listing, settings)

POST to webhook URL with:

```json
{
  "username": "PicClick Watcher",
  "embeds": [{
    "title": "🃏 New Match",
    "description": "<listing title>",
    "color": 10070793,
    "fields": [...],
    "thumbnail": { "url": "<image>" },
    "footer": { "text": "PicClick Watcher" },
    "timestamp": "<ISO>"
  }]
}
```

Respects `settings.includeImage` and `settings.includeAmazonLink`.

## sendTestDiscord(webhookUrl)

Sends a simple "Webhook Connected" embed for Settings → **Send Test Message**.

## Error handling

- Non-2xx response → throws → caught in `watcher-runner.ts`
- Failed send still saves `AlertRecord` with `discordStatus: 'failed'`
- Logged via `logger.error()`

## Webhook URL source

Configured in **Settings** → stored in SQLite. Optional per-watcher override on Watcher form.

## How to extend

### @role ping on alert

1. Add `discordRoleId` to `AppSettings`
2. Prepend `"content": "<@&roleId>"` to webhook payload

### Multiple webhooks

1. Change `discordWebhookUrl` to `string[]` or add `additionalWebhooks`
2. Loop `sendDiscordAlert` for each URL

### Different embed per watcher

Pass watcher-specific template ID or color in `Watcher` model; use in embed builder.

### Rate limit handling

Discord allows ~30 requests/min per webhook. Add queue/delay in `watcher-runner` if many matches in one poll.

## Related docs

- [ALERTS.md](./ALERTS.md)
- [SETTINGS.md](./SETTINGS.md)
