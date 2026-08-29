#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> git pull"
git pull

echo "==> install dependencies"
npm ci
(cd server && npm ci)

echo "==> db push"
# 마이그레이션 파일 없이 schema.prisma 상태로 DB를 직접 맞추는 방식 — 데이터 손실이
# 있는 변경은 --accept-data-loss 없이는 여기서 실패하고 스크립트가 즉시 중단되므로
# (set -e), 이후 build/restart로 넘어가지 않고 기존 코드/프로세스가 그대로 유지된다.
(cd server && npm run db:push)

echo "==> build"
npm run build:prod

echo "==> restart pm2"
pm2 restart deploy/ecosystem.config.cjs || pm2 start deploy/ecosystem.config.cjs

pm2 save
echo "==> deploy done"
