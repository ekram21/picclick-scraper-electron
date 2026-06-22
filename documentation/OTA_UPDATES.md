# Over-the-Air (OTA) Updates

This app uses **`electron-updater`** to deliver updates to installed users automatically. Updates are hosted on **GitHub Releases**.

---

## How it works (user side)

1. User installs the packaged app (`.dmg` on macOS, `.exe` installer on Windows).
2. On startup (and every 6 hours), the app checks GitHub Releases for a newer version.
3. If an update exists, it downloads in the background.
4. A banner appears in the app: **“Update ready — restart to install”**.
5. User clicks **Restart & Install** (or quits and reopens — `autoInstallOnAppQuit` is enabled).

> OTA updates **do not work** in dev mode (`npm run dev`). They only apply to packaged builds installed from a release.

---

## One-time setup

### 1. Set your GitHub publish config

In `package.json`, update the `build.publish` block:

```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_USERNAME",
  "repo": "picclick-scraper-electron"
}
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username or org.

### 2. Ensure the repo is on GitHub — and public

Push this project to:

```
https://github.com/YOUR_GITHUB_USERNAME/picclick-scraper-electron
```

**The repository must be public** for OTA updates to work out of the box. Private repos return 404 to the app (no auth token is bundled). If you need a private repo, use a custom update server instead.

You also need **at least one GitHub Release** published (run `npm run deploy:live` for the first one). Until then, the app will show “No published releases found yet” instead of an error.

### 3. (Recommended) Code signing

| Platform | Why it matters |
|----------|----------------|
| **macOS** | Unsigned apps may block updates or show Gatekeeper warnings. For production, use an Apple Developer ID certificate and notarize the app. |
| **Windows** | Optional but recommended — reduces SmartScreen warnings. |

Without signing, updates may still work for users who already bypassed install warnings, but signing is strongly recommended for distribution.

### 4. Enable GitHub Actions (automated releases)

The repo includes `.github/workflows/release.yml`. It runs when you push a version tag (`v*`).

No extra secrets are required for public repos — `GITHUB_TOKEN` is provided automatically.

---

## Pushing an update (one command)

Once setup is complete, deploy a live OTA update with:

```bash
npm run deploy:live
```

This will:

1. **Auto-increment** the patch version (`1.0.0` → `1.0.1`)
2. **Commit** `package.json` + `package-lock.json`
3. **Tag** the release (`v1.0.1`)
4. **Push** to GitHub → triggers CI to build macOS + Windows and publish to Releases
5. **Installed apps** pick up the update automatically within minutes

Other bump types:

```bash
npm run deploy:live:minor   # 1.0.0 → 1.1.0
npm run deploy:live:major   # 1.0.0 → 2.0.0
```

**Requirements before running:**

- All changes committed (clean working tree)
- `origin` remote pointing to GitHub
- `build.publish.owner` set in `package.json` (already `ekram21`)

Monitor the build: [github.com/ekram21/picclick-scraper-electron/actions](https://github.com/ekram21/picclick-scraper-electron/actions)

---

## Pushing an update (manual)

Use this if you prefer full control over versioning.

### Step 1 — Bump the version

Edit `package.json`:

```json
"version": "1.0.1"
```

Use [semver](https://semver.org/): `MAJOR.MINOR.PATCH` (e.g. `1.0.0` → `1.0.1` for a bug fix).

### Step 2 — Commit and tag

```bash
git add package.json
git commit -m "chore: release v1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

The tag **must** start with `v` and match the version in `package.json` (tag `v1.0.1` → version `1.0.1`).

### Step 3 — Wait for CI

GitHub Actions will:

1. Build on **macOS** and **Windows**
2. Run `npm run dist`
3. Upload all artifacts to a GitHub Release for that tag

Check progress: **GitHub → Actions → Release**

### Step 4 — Verify the release assets

Open **GitHub → Releases → v1.0.1** and confirm these files exist:

**macOS (required for auto-update):**
- `PicClick Watcher-x.x.x-mac.zip`
- `PicClick Watcher-x.x.x-mac.zip.blockmap`
- `latest-mac.yml`

**Windows:**
- `PicClick Watcher Setup x.x.x.exe`
- `PicClick Watcher Setup x.x.x.exe.blockmap`
- `latest.yml`

**Optional (manual install only):**
- `PicClick Watcher-x.x.x.dmg` (macOS — users install manually; updates use the `.zip`)

If `latest-mac.yml` / `latest.yml` are missing, installed apps **cannot** detect updates.

### Step 5 — Users receive the update

Installed apps check within ~5 seconds of launch, then every 6 hours. No action needed on your end.

---

## Pushing an update (manual)

Use this if you prefer not to use CI, or for a one-off release.

### Step 1 — Bump version in `package.json`

Same as above (e.g. `1.0.1`).

### Step 2 — Build locally

**macOS** (build on a Mac):

```bash
npm run dist:mac
```

**Windows** (build on Windows):

```bash
npm run dist:win
```

Output goes to the `release/` folder.

### Step 3 — Create a GitHub Release

1. Go to **GitHub → Releases → Draft a new release**
2. Choose tag: `v1.0.1` (create the tag if it doesn’t exist)
3. Title: `v1.0.1`
4. Upload **all files** from `release/`:
   - Installers (`.dmg`, `.exe`)
   - `.zip` + `.blockmap` (macOS auto-update)
   - `latest-mac.yml` and/or `latest.yml` ← **critical**

5. Publish the release

---

## What users need

| Requirement | Details |
|-------------|---------|
| Installed packaged app | Not `npm run dev` |
| Internet access | To reach GitHub Releases |
| Same repo configured in `publish` | App checks the repo you set in `package.json` at build time |
| Newer version on GitHub | Version in release must be **higher** than installed version |

---

## In-app update controls

Users can also check manually:

**Settings → Updates → Check for Updates**

When a download completes, they click **Restart & Install**.

---

## Release checklist

Before every release:

- [ ] Bump `version` in `package.json`
- [ ] Tag matches version (`v1.0.1` ↔ `"version": "1.0.1"`)
- [ ] CI passed (or manual build succeeded)
- [ ] GitHub Release contains `latest-mac.yml` / `latest.yml`
- [ ] GitHub Release contains `.zip` (macOS) or `.exe` (Windows) + `.blockmap`
- [ ] Tested installed app can see the new version (install previous release, publish new one, open app)

---

## Troubleshooting

### 404 error / `releases.atom` in Settings

This means the app cannot read GitHub Releases. Common causes:

1. **No release published yet** — run `npm run deploy:live` once to create v1.0.0 on GitHub Releases
2. **Repo is private** — GitHub returns 404 without authentication. **Make the repo public** (Settings → General → Change visibility) or use a custom update server
3. **Wrong repo name** in `package.json` → `build.publish`

After fixing, rebuild the app (`npm run dist:mac`) so users get the friendlier error messages, then ship via `deploy:live`.

### “Updates apply to installed builds only”

User is running `npm run dev`. They need the `.dmg` / `.exe` installer.

### “Update check failed” / no update found

| Cause | Fix |
|-------|-----|
| Wrong `owner` / `repo` in `package.json` | Fix `build.publish` and rebuild |
| Missing `latest-mac.yml` or `latest.yml` on release | Re-upload from `release/` folder |
| Version not bumped | New release must be **higher** semver than installed |
| Private repo without token | App can’t read releases — use a public repo or configure a token (advanced) |
| Tag / version mismatch | Tag `v1.0.2` must match `"version": "1.0.2"` |

### macOS update downloads but won’t install

Usually code signing / notarization. Sign the app with Apple Developer ID before distributing.

### CI release missing yml files

Ensure `GH_TOKEN` is available during build (the workflow sets this). If building locally for manual upload, the yml files are still generated in `release/` — upload them with the release.

---

## Version numbering guide

| Change type | Example | When to use |
|-------------|---------|-------------|
| Patch | `1.0.0` → `1.0.1` | Bug fixes, scraper tweaks |
| Minor | `1.0.0` → `1.1.0` | New features (new filters, UI pages) |
| Major | `1.0.0` → `2.0.0` | Breaking changes |

---

## Quick reference

```bash
# One-command live deploy (recommended)
npm run deploy:live

# Typical manual release flow
# 1. Edit package.json version → "1.0.1"
git add package.json
git commit -m "chore: release v1.0.1"
git tag v1.0.1
git push origin main && git push origin v1.0.1

# GitHub Actions builds + publishes to Releases
# Users with older versions auto-update via OTA
```

---

## Architecture summary

```
You push tag v1.0.1
       ↓
GitHub Actions builds macOS + Windows
       ↓
Artifacts uploaded to GitHub Release
  (including latest-mac.yml / latest.yml)
       ↓
Installed apps (electron-updater)
  fetch yml → compare semver → download zip/exe
       ↓
User restarts → update applied
```

For questions about signing or private repos, see [electron-builder publish docs](https://www.electron.build/configuration/publish) and [electron-updater docs](https://www.electron.build/auto-update).
