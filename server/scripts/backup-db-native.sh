#!/usr/bin/env bash
# Nightly Postgres backup for hosts where Postgres runs natively (systemd service),
# not in Docker — unlike backup-db.sh, which assumes docker-compose's goodbus-postgres
# container. Used on the Cafe24 dev VPS (Postgres 17 installed by the StackScript).
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
source .env
set +a

BACKUP_DIR="${BACKUP_DIR:-/var/backups/goodbus}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%F_%H%M%S)"
OUT_FILE="$BACKUP_DIR/goodbus_${TIMESTAMP}.sql.gz"

echo "==> Dumping via DATABASE_URL to $OUT_FILE"
# pg_dump uses libpq URI parsing, which doesn't understand Prisma's ?schema= extension.
pg_dump "${DATABASE_URL%%\?*}" | gzip > "$OUT_FILE"

echo "==> Wrote $(du -h "$OUT_FILE" | cut -f1)"

echo "==> Pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'goodbus_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "==> Backup done: $OUT_FILE"
