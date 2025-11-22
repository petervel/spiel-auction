#!/bin/sh
set -e

# Load env vars from .env so we have DATABASE_ROOT_PASSWORD
export $(grep -v '^#' .env | xargs)

BACKUP_FILE="${1:-backup.sql}"

echo "Creating MySQL dump into ${BACKUP_FILE}..."

docker compose exec -T db \
  mysqldump \
    -u root \
    -p"$DATABASE_ROOT_PASSWORD" \
    --all-databases \
    --single-transaction \
    --routines \
    --events \
  > "$BACKUP_FILE"

echo "Done. Backup created at: $BACKUP_FILE"
