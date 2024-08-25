#!/bin/sh

set -a
[ -f .env ] && . ./.env
set +a

# Check if the migrations table exists to determine if this is the first deployment
if npx prisma migrate status --schema ./prisma/schema.prisma | grep 'Database schema is up to date'; then
  echo "Database schema is up to date. Applying migrations..."
  npx prisma migrate deploy
else
  echo "Database schema is not initialized. Pushing initial schema..."
  npx prisma db push --accept-data-loss
fi

# Execute the provided command
exec "$@"