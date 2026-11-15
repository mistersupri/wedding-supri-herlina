#!/usr/bin/env bash
# Restore a backup made by scripts/backup.sh into the Docker Compose deployment.
#   ./scripts/restore.sh backups/db-20261120-210000.sql.gz [backups/uploads-20261120-210000.tar.gz]
# REPLACES the current database (and uploads, when a tar is given). Asks for confirmation first.
set -euo pipefail

cd "$(dirname "$0")/.."
DB_DUMP="${1:?Pemakaian: restore.sh <db-*.sql.gz> [uploads-*.tar.gz]}"
UPLOADS_TAR="${2:-}"
[ -f "$DB_DUMP" ] || { echo "Berkas tidak ditemukan: $DB_DUMP" >&2; exit 1; }
[ -z "$UPLOADS_TAR" ] || [ -f "$UPLOADS_TAR" ] || { echo "Berkas tidak ditemukan: $UPLOADS_TAR" >&2; exit 1; }

if [ -f .env ]; then set -a; . ./.env; set +a; fi
DB_USER="${POSTGRES_USER:-undangan}"
DB_NAME="${POSTGRES_DB:-undangan}"
PROJECT="$(docker compose config --format json | sed -n 's/.*"name": *"\([^"]*\)".*/\1/p' | head -n 1)"
PROJECT="${PROJECT:-undangan}"

read -r -p "Ini MENGGANTI database${UPLOADS_TAR:+ dan folder unggahan} yang sekarang. Ketik RESTORE untuk lanjut: " answer
[ "$answer" = "RESTORE" ] || { echo "Dibatalkan."; exit 1; }

echo "Menghentikan aplikasi..."
docker compose stop app

echo "Memulihkan database..."
gunzip -c "$DB_DUMP" | docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 --quiet

if [ -n "$UPLOADS_TAR" ]; then
  echo "Memulihkan unggahan..."
  docker run --rm -v "${PROJECT}_uploads:/data" -v "$(cd "$(dirname "$UPLOADS_TAR")" && pwd):/backup:ro" alpine \
    sh -c "find /data -mindepth 1 -delete && tar xzf /backup/$(basename "$UPLOADS_TAR") -C /data"
fi

echo "Menyalakan aplikasi..."
docker compose start app
echo "Selesai."
