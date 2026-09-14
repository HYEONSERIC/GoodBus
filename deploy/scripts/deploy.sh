#!/usr/bin/env bash
set -euo pipefail

# This host's app runs as a non-root "appuser" (Cafe24 dev VPS convention since the
# 2026-09-14 migration — see DEPLOYMENT.md "0. 현재 실제 배포 현황"). Re-exec as that
# user so build artifacts and the pm2 process list stay owned by the account that
# actually runs them, instead of getting root-owned files mixed into appuser's tree.
if [ "$(id -u)" -eq 0 ] && id appuser &>/dev/null; then
    exec sudo -u appuser "$0" "$@"
fi

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
