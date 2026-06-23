#!/usr/bin/env bash
# Import a Developer ID .p12 into a temporary keychain for electron-builder (CI).
# Required env: MACOS_CERTIFICATE (base64 .p12), MACOS_CERTIFICATE_PASSWORD
set -euo pipefail

if [[ -z "${MACOS_CERTIFICATE:-}" ]]; then
  echo "Error: MACOS_CERTIFICATE secret is not set"
  exit 1
fi

if [[ -z "${MACOS_CERTIFICATE_PASSWORD:-}" ]]; then
  echo "Error: MACOS_CERTIFICATE_PASSWORD secret is not set"
  exit 1
fi

KEYCHAIN_PATH="${RUNNER_TEMP:?}/app-signing.keychain-db"
KEYCHAIN_PASSWORD="$(openssl rand -base64 32)"
CERT_PATH="${RUNNER_TEMP}/certificate.p12"

echo "$MACOS_CERTIFICATE" | base64 --decode > "$CERT_PATH"

security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

security import "$CERT_PATH" \
  -P "$MACOS_CERTIFICATE_PASSWORD" \
  -A \
  -t cert \
  -f pkcs12 \
  -k "$KEYCHAIN_PATH"

security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security list-keychain -d user -s "$KEYCHAIN_PATH"

if [[ -n "${GITHUB_ENV:-}" ]]; then
  {
    echo "CSC_LINK=$CERT_PATH"
    echo "CSC_KEY_PASSWORD=$MACOS_CERTIFICATE_PASSWORD"
    echo "KEYCHAIN_PATH=$KEYCHAIN_PATH"
  } >> "$GITHUB_ENV"
fi

echo "Developer ID certificate imported into temporary keychain"
