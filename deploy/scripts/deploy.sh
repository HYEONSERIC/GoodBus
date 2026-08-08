#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> git pull"
git pull

echo "==> install dependencies"
npm ci
(cd server && npm ci)

echo "==> build"
npm run build:prod

echo "==> restart pm2"
pm2 restart deploy/ecosystem.config.cjs || pm2 start deploy/ecosystem.config.cjs

pm2 save
echo "==> deploy done"
