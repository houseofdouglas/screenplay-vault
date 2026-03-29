#!/usr/bin/env bash
# deploy.sh — pull latest code, rebuild, and restart the server.
# Run from the repo root on the Pi:
#   bash deploy/pi/deploy.sh
#
# The script will prompt you to restart the systemd service at the end,
# since that step requires sudo.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

echo "==> Pulling latest from origin/main..."
git pull --ff-only origin main

echo "==> Installing dependencies (only runs if lockfile changed)..."
pnpm install --frozen-lockfile

echo "==> Building all packages..."
pnpm -r build

echo ""
echo "Build complete. Restart the service to apply changes:"
echo ""
echo "  sudo systemctl restart screenplay-vault"
echo ""
