#!/usr/bin/env bash
# Restore drill: proves the latest backup is actually restorable, without touching
# the production database. Spins up a throwaway Postgres container on a separate
# port, restores the newest backup into it, runs a sanity query, then tears it down.
# Run monthly (see DEPLOYMENT.md "8-2. DB 자동 백업") — a backup nobody has restored
# is not a backup.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/goodbus}"
REHEARSAL_CONTAINER="${REHEARSAL_CONTAINER:-goodbus-postgres-rehearsal}"
REHEARSAL_PORT="${REHEARSAL_PORT:-5433}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-goodbus}"

LATEST="$(ls -t "$BACKUP_DIR"/goodbus_*.sql.gz 2>/dev/null | head -n1 || true)"
if [ -z "$LATEST" ]; then
    echo "No backup found in $BACKUP_DIR — nothing to rehearse." >&2
    exit 1
fi
echo "==> Rehearsing restore of $LATEST"

cleanup() {
    echo "==> Cleaning up $REHEARSAL_CONTAINER"
    docker rm -f "$REHEARSAL_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$REHEARSAL_CONTAINER" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB="$DB_NAME" \
    -p "${REHEARSAL_PORT}:5432" \
    postgres:16-alpine >/dev/null

echo "==> Waiting for rehearsal Postgres to accept connections"
for _ in $(seq 1 30); do
    if docker exec "$REHEARSAL_CONTAINER" pg_isready -U "$DB_USER" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

echo "==> Restoring backup"
gunzip -c "$LATEST" | docker exec -i "$REHEARSAL_CONTAINER" psql -U "$DB_USER" "$DB_NAME" >/dev/null

echo "==> Sanity check"
USER_COUNT="$(docker exec "$REHEARSAL_CONTAINER" psql -U "$DB_USER" "$DB_NAME" -t -A -c 'SELECT count(*) FROM "User";')"
echo "    User rows restored: $USER_COUNT"

if [ "$USER_COUNT" -lt 1 ]; then
    echo "FAILED: restored database has no User rows — backup may be broken." >&2
    exit 1
fi

echo "==> Restore rehearsal passed: $LATEST is restorable ($USER_COUNT users)"
