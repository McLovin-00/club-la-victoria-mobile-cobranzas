#!/bin/sh
set -e

npx prisma migrate deploy --schema=src/prisma/schema.prisma

if [ "$SEED" = "true" ]; then
  node dist/prisma/seed.js || true
fi

exec node dist/index.js
