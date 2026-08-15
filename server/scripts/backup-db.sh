#!/usr/bin/env bash
# Nightly Postgres backup. Intended for cron (see DEPLOYMENT.md "8-2. DB 자동 백업").
#
# Postgres runs as a named Docker volume (server/docker-compose.yml), not a bind mount,
# so the data directory isn't directly reachable from the host — pg_dump has to go
# through `docker exec` against the running container.
set -euo pipefail

CONTAINER="${POSTGRES_CONTAINER:-goodbus-postgres}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-goodbus}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/goodbus}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%F_%H%M%S)"
OUT_FILE="$BACKUP_DIR/goodbus_${TIMESTAMP}.sql.gz"

echo "==> Dumping $DB_NAME from container $CONTAINER to $OUT_FILE"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUT_FILE"

echo "==> Wrote $(du -h "$OUT_FILE" | cut -f1)"

echo "==> Pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name 'goodbus_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "==> Backup done: $OUT_FILE"
