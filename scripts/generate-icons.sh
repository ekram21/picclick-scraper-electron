#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RES="$ROOT/resources"
SRC="$RES/icon.png"

if [[ ! -f "$SRC" ]]; then
  echo "Error: resources/icon.png not found"
  exit 1
fi

echo "→ Ensuring square 1024×1024 source"
sips -g pixelWidth -g pixelHeight "$SRC" | rg -q "1024" || sips -z 1024 1024 "$SRC" --out "$SRC"

echo "→ Generating icon.ico (Windows)"
npx --yes png-to-ico "$SRC" > "$RES/icon.ico"

echo "→ Generating icon.icns (macOS)"
ICONSET="$RES/icon.iconset"
rm -rf "$ICONSET"
mkdir "$ICONSET"

sips -z 16 16     "$SRC" --out "$ICONSET/icon_16x16.png"
sips -z 32 32     "$SRC" --out "$ICONSET/icon_16x16@2x.png"
sips -z 32 32     "$SRC" --out "$ICONSET/icon_32x32.png"
sips -z 64 64     "$SRC" --out "$ICONSET/icon_32x32@2x.png"
sips -z 128 128   "$SRC" --out "$ICONSET/icon_128x128.png"
sips -z 256 256   "$SRC" --out "$ICONSET/icon_128x128@2x.png"
sips -z 256 256   "$SRC" --out "$ICONSET/icon_256x256.png"
sips -z 512 512   "$SRC" --out "$ICONSET/icon_256x256@2x.png"
sips -z 512 512   "$SRC" --out "$ICONSET/icon_512x512.png"
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png"

iconutil -c icns "$ICONSET" -o "$RES/icon.icns"
rm -rf "$ICONSET"

mkdir -p "$ROOT/public"
cp "$SRC" "$ROOT/public/icon.png"

echo "✓ Icons written to resources/ and public/"
