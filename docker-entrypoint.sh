#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL belum diisi." >&2
  exit 1
fi

# Apply pending migrations before the app starts. Set SKIP_MIGRATIONS=1 when
# migrations run as a separate release step (e.g. several replicas).
if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  node node_modules/prisma/build/index.js migrate deploy
fi

# exec, so the app is PID 1's direct child and receives SIGTERM from `docker stop`.
exec "$@"
