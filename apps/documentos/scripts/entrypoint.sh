#!/bin/sh
set -e

npx prisma migrate deploy --schema=src/prisma/schema.prisma

if [ "$SEED" = "true" ]; then
  node dist/src/prisma/seed.js || true
fi

exec node dist/src/index.js
