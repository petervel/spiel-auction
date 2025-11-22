#!/bin/sh
set -e

# Load env vars from .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKUP_DIR="backups"

print_usage() {
  cat <<EOF
Usage: $0 <command> [options]

Commands:
  connect                 Connect to the main database as the app user
  export [FILENAME]       Export ALL databases to backups/FILENAME (default: backup.sql)
  import [FILENAME]       Import from backups/FILENAME (default: backup.sql) and OVERWRITE data

Environment (from .env):
  DATABASE_NAME            Name of the main application database
  DATABASE_USER            User to connect as for 'connect'
  DATABASE_PASSWORD        Password for DATABASE_USER
  DATABASE_ROOT_PASSWORD   Root password for export/import

Examples:
  $0 connect
  $0 export
  $0 export prod-2025-11-22.sql
  $0 import
  $0 import prod-2025-11-22.sql
EOF
}

cmd="$1"
shift || true  # safely ignore if no extra args

case "$cmd" in
  connect)
    if [ -z "$DATABASE_NAME" ]; then
      echo "Error: DATABASE_NAME is not set in .env"
      exit 1
    fi

    echo "Connecting to database '$DATABASE_NAME' as user '$DATABASE_USER'..."
    docker compose exec db \
      mysql -u"$DATABASE_USER" -p"$DATABASE_PASSWORD" "$DATABASE_NAME"
    ;;

  export)
    FILE_NAME="${1:-backup.sql}"
    mkdir -p "$BACKUP_DIR"
    BACKUP_PATH="$BACKUP_DIR/$FILE_NAME"

    echo "Creating MySQL dump into ${BACKUP_PATH}..."

    docker compose exec -T db \
      mysqldump \
        -u root \
        -p"$DATABASE_ROOT_PASSWORD" \
        --all-databases \
        --single-transaction \
        --routines \
        --events \
      > "$BACKUP_PATH"

    echo "Done. Backup created at: $BACKUP_PATH"
    ;;

  import)
    FILE_NAME="${1:-backup.sql}"
    BACKUP_PATH="$BACKUP_DIR/$FILE_NAME"

    if [ ! -f "$BACKUP_PATH" ]; then
      echo "Backup file $BACKUP_PATH not found."
      exit 1
    fi

    echo "============================================================"
    echo "  WARNING: You are about to import '$BACKUP_PATH' into MySQL."
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

    echo "Importing $BACKUP_PATH into MySQL..."

    docker compose exec -T db \
      mysql -u root -p"$DATABASE_ROOT_PASSWORD" \
      < "$BACKUP_PATH"

    echo "Done. Import completed."
    ;;

  ""|help|-h|--help)
    print_usage
    ;;

  *)
    echo "Unknown command: $cmd"
    echo
    print_usage
    exit 1
    ;;
esac
