#!/usr/bin/env bash
# Backup for the Docker Compose deployment: the PostgreSQL database and the uploads volume.
#   ./scripts/backup.sh [target-dir]      (default: ./backups)
# Writes db-<timestamp>.sql.gz and uploads-<timestamp>.tar.gz. Run it from the folder that holds docker-compose.yml.
set -euo pipefail

cd "$(dirname "$0")/.."
TARGET="${1:-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$TARGET"

# Same defaults as docker-compose.yml; values in .env win.
if [ -f .env ]; then set -a; . ./.env; set +a; fi
DB_USER="${POSTGRES_USER:-undangan}"
DB_NAME="${POSTGRES_DB:-undangan}"
PROJECT="$(docker compose config --format json | sed -n 's/.*"name": *"\([^"]*\)".*/\1/p' | head -n 1)"
PROJECT="${PROJECT:-undangan}"

echo "Database -> $TARGET/db-$STAMP.sql.gz"
docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists | gzip > "$TARGET/db-$STAMP.sql.gz.tmp"
mv "$TARGET/db-$STAMP.sql.gz.tmp" "$TARGET/db-$STAMP.sql.gz"

echo "Unggahan -> $TARGET/uploads-$STAMP.tar.gz"
docker run --rm -v "${PROJECT}_uploads:/data:ro" -v "$(cd "$TARGET" && pwd):/backup" alpine \
  sh -c "tar czf /backup/uploads-$STAMP.tar.gz.tmp -C /data . && mv /backup/uploads-$STAMP.tar.gz.tmp /backup/uploads-$STAMP.tar.gz"

echo "Selesai."
ls -lh "$TARGET"/*-"$STAMP".*
