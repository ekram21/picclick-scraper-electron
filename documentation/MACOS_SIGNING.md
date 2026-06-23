# macOS Code Signing & Notarization

PicClick Watcher uses **Developer ID signing** and **Apple notarization** in CI so macOS in-app updates (Squirrel.Mac) work and Gatekeeper does not block installs.

---

## What you need

| Requirement | Cost / notes |
|-------------|--------------|
| [Apple Developer Program](https://developer.apple.com/programs/) membership | $99/year |
| **Developer ID Application** certificate | Created in Apple Developer portal or Keychain Access |
| Exported `.p12` certificate + password | For GitHub Actions |
| Apple ID + **app-specific password** | For notarization API |
| **Team ID** | 10-character ID from developer.apple.com |

---

## Step 1 — Create a Developer ID Application certificate

1. Open **Keychain Access** on your Mac.
2. **Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority…**
3. Enter your email, select **Saved to disk**, save the `.certSigningRequest` file.
4. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/certificates/list).
5. Click **+** → **Developer ID Application** → upload the CSR → download the `.cer`.
6. Double-click the `.cer` to install it in Keychain (login keychain).

You should see **Developer ID Application: Your Name (TEAMID)** in Keychain Access.

---

## Step 2 — Export the certificate as `.p12`

1. In Keychain Access, open **login** keychain → **My Certificates**.
2. Expand **Developer ID Application: …** and confirm the private key is present.
3. Select the certificate (with private key) → **File → Export Items…**
4. Format: **Personal Information Exchange (.p12)** → save as e.g. `developer-id.p12`.
5. Set an export password — you will use this as `MACOS_CERTIFICATE_PASSWORD`.

---

## Step 3 — Base64-encode the certificate for GitHub

On your Mac:

```bash
base64 -i developer-id.p12 | pbcopy
```

This copies the base64 string to your clipboard for the `MACOS_CERTIFICATE` secret.

---

## Step 4 — Create an app-specific password

1. Go to [appleid.apple.com](https://appleid.apple.com/) → **Sign-In and Security**.
2. **App-Specific Passwords** → generate one named e.g. `picclick-watcher-ci`.
3. Save it — this is `APPLE_APP_SPECIFIC_PASSWORD` (shown only once).

Use the **Apple ID email** that owns the Developer Program account as `APPLE_ID`.

---

## Step 5 — Find your Team ID

1. [developer.apple.com/account](https://developer.apple.com/account) → **Membership details**.
2. Copy **Team ID** (10 characters, e.g. `AB12CD34EF`).

---

## Step 6 — Add GitHub repository secrets

**GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|-------------|--------|
| `MACOS_CERTIFICATE` | Base64 contents of the `.p12` file |
| `MACOS_CERTIFICATE_PASSWORD` | Password you set when exporting `.p12` |
| `APPLE_ID` | Apple ID email (Developer Program account) |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password from Step 4 |
| `APPLE_TEAM_ID` | 10-character Team ID |

All five are **required** — the Release workflow fails early with a clear error if any are missing.

---

## Step 7 — Ship a signed release

After secrets are configured:

```bash
npm run deploy:live
```

The **build-mac** job will:

1. Import the certificate into a temporary keychain
2. Run `electron-builder --mac` with code signing
3. Submit the app to Apple for notarization (usually 2–10 minutes)
4. Upload signed `.dmg`, `.zip`, `latest-mac.yml`, and blockmaps to GitHub Releases

Monitor: **GitHub → Actions → Release**

---

## Verify a release

On a Mac, after installing from the new release:

1. **Settings → Updates → Check for Updates** — should detect newer versions when available.
2. Download completes → **Restart & Install** should work without reverting to an error.
3. Optional terminal check on the `.app`:

```bash
codesign -dv --verbose=4 "/Applications/PicClick Watcher.app"
spctl -a -vv "/Applications/PicClick Watcher.app"
```

Expect `Developer ID Application` and `accepted` / notarized status.

---

## Local signed builds (optional)

Export the same env vars on your Mac, then:

```bash
export CSC_LINK=/path/to/developer-id.p12
export CSC_KEY_PASSWORD='your-p12-password'
export APPLE_ID='you@example.com'
export APPLE_APP_SPECIFIC_PASSWORD='xxxx-xxxx-xxxx-xxxx'
export APPLE_TEAM_ID='AB12CD34EF'

npm run dist:mac
```

Without these variables, local builds remain **unsigned** (fine for dev). CI always signs when secrets are set.

---

## Troubleshooting

### CI: `Missing GitHub secret: …`

Add all five secrets from Step 6.

### CI: `errSecInternalComponent` or import failed

- Confirm `.p12` includes the **private key** (export from My Certificates with key expanded).
- Re-encode: `base64 -i developer-id.p12` with no line breaks in the secret.

### CI: Notarization failed

- Verify `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`.
- App-specific password must be valid (regenerate if revoked).
- Check Actions log for Apple's rejection reason (entitlements, hardened runtime).

### App still won't in-app update

- User must install a **signed** build first (v1.0.4+ after this setup).
- Older unsigned installs cannot Squirrel-update to signed builds in all cases — install the latest `.dmg` once manually.

### Certificate expiry

Developer ID certificates expire after ~5 years. Before expiry: create a new cert, export new `.p12`, update `MACOS_CERTIFICATE` and password secrets.

---

## Files in this repo

| File | Purpose |
|------|---------|
| `build/entitlements.mac.plist` | Hardened runtime entitlements (Electron + native modules) |
| `scripts/import-macos-cert.sh` | CI keychain + certificate import |
| `.github/workflows/release.yml` | Signs and notarizes on tag push |
| `package.json` → `build.mac` | `entitlements`, `notarize: true`, `hardenedRuntime` |

---

## Related docs

- [OTA_UPDATES.md](./OTA_UPDATES.md) — release flow and user-facing update behavior
- [electron-builder code signing](https://www.electron.build/code-signing)
- [electron-builder mac notarize](https://www.electron.build/electron-builder/index.html#notarize)
