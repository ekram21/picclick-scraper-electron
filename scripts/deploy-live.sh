#!/usr/bin/env bash
set -euo pipefail

# Bump type: patch (default), minor, or major
BUMP="${1:-patch}"

if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: bump type must be patch, minor, or major (got: $BUMP)"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Preflight checks"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Error: not a git repository"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: working tree has uncommitted changes. Commit or stash them first."
  git status --short
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "Error: no 'origin' remote configured"
  exit 1
fi

OWNER="$(node -p "require('./package.json').build.publish.owner")"
if [[ -z "$OWNER" || "$OWNER" == "REPLACE_WITH_GITHUB_USERNAME" ]]; then
  echo "Error: set build.publish.owner in package.json before deploying"
  exit 1
fi

CURRENT="$(node -p "require('./package.json').version")"
echo "  Current version: v$CURRENT"
echo "  Bump type:       $BUMP"
echo "  Publish target:  github.com/$OWNER/$(node -p "require('./package.json').build.publish.repo")"

BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "main" && "$BRANCH" != "master" ]]; then
  echo "Warning: you are on branch '$BRANCH', not main/master"
  read -r -p "Continue anyway? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

echo ""
echo "→ Bumping version ($BUMP)"
npm version "$BUMP" -m "chore: release v%s"

NEW_VERSION="$(node -p "require('./package.json').version")"
TAG="v$NEW_VERSION"

echo ""
echo "→ Pushing to origin (triggers GitHub Actions release + OTA)"
git push origin HEAD
git push origin "$TAG"

echo ""
echo "✓ Release v$NEW_VERSION pushed"
echo ""
echo "  GitHub Actions is now building macOS + Windows installers."
echo "  When complete, installed apps will receive the OTA update automatically."
echo ""
echo "  Monitor: https://github.com/$OWNER/$(node -p "require('./package.json').build.publish.repo")/actions"
echo "  Release: https://github.com/$OWNER/$(node -p "require('./package.json').build.publish.repo")/releases/tag/$TAG"
