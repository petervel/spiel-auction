set -a
[ -f .env ] && . ./.env
set +a

echo "Starting backend entrypoint..."

#Check if migrations exist
if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations)" ]; then
    echo "Migrations folder detected. Attempting migrate deploy..."
    npx prisma migrate deploy || {
        echo "Migration failed. Check database state and migrations."
        exit 1
    }
else
    echo "No migrations found. Pushing schema directly (db push)..."
    npx prisma db push --accept-data-loss || {
        echo "db push failed. Check database connection."
        exit 1
    }
fi

echo "Prisma setup complete. Starting backend..."
exec "$@"
