# App icons

| File | Purpose |
|------|---------|
| `icon.png` | Master icon (1024×1024) — edit this to change the look |
| `icon.icns` | macOS app icon (auto-generated) |
| `icon.ico` | Windows app icon (auto-generated) |

## Replace the icon

1. Swap `resources/icon.png` with your new 1024×1024 PNG (square).
2. Regenerate platform formats:

```bash
npm run icons:generate
```

3. Copy favicon for dev UI:

```bash
cp resources/icon.png public/icon.png
```

4. Rebuild the app:

```bash
npm run dist:mac   # or dist:win
```

electron-builder reads icons from this folder via `buildResources: "resources"`.
