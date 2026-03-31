#!/bin/sh
set -e

# Run Prisma migrations
npx prisma migrate deploy --schema=src/prisma/schema.prisma

# Start the application
exec node dist/src/index.js
