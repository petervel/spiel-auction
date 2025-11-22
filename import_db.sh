#!/bin/sh
set -e

export $(grep -v '^#' .env | xargs)

BACKUP_FILE="${1:-backup.sql}"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file $BACKUP_FILE not found in current directory."
  exit 1
fi

echo "============================================================"
echo "  WARNING: You are about to import '$BACKUP_FILE' into MySQL."
echo "  This will effectively OVERWRITE existing data in the"
echo "  databases contained in this backup (drop & recreate tables,"
echo "  replace data, etc.)."
echo "============================================================"
printf "Type 'yes' to continue, or anything else to cancel: "
read CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted. No changes were made."
  exit 0
fi

echo "Importing $BACKUP_FILE into MySQL..."

docker compose exec -T db \
  mysql -u root -p"$DATABASE_ROOT_PASSWORD" \
  < "$BACKUP_FILE"

echo "Done. Import completed."
