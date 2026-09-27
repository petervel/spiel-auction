#!/bin/sh
set -e

# Load env vars from .env. Read line-by-line rather than
# `export $(... | xargs)` - the latter word-splits on any space, which
# breaks on values like `EMAIL_FROM=Spiel Auction <no-reply@...>`.
if [ -f .env ]; then
  while IFS='=' read -r key value; do
    case "$key" in
      ''|'#'*) continue ;;
    esac
    export "$key=$value"
  done < .env
fi

BACKUP_DIR="backups"
AUTO_BACKUP_DIR="$BACKUP_DIR/auto"

# Retention for 'backup': every daily dump for DAILY_DAYS days, then
# thinned to one per ISO week for WEEKLY_WEEKS more weeks, then one per
# calendar month for MONTHLY_MONTHS more months, then deleted outright.
DAILY_DAYS=7
WEEKLY_WEEKS=4
MONTHLY_MONTHS=6

# Portable "format a YYYY-MM-DD date string" - GNU date (-d, production's
# Linux host) vs BSD date (-j -f, for running/testing this locally on
# macOS). The format specifiers themselves (%s, %G, %V) are supported by
# both - only the parsing flag differs.
fmt_date() {
  date -d "$2" "+$1" 2>/dev/null || date -j -f '%Y-%m-%d' "$2" "+$1"
}

print_usage() {
  cat <<EOF
Usage: $0 <command> [options]

Commands:
  connect                 Connect to the main database as the app user (default if no command given)
  export [FILENAME]       Export ALL databases to backups/FILENAME (default: backup.sql)
  import [FILENAME]       Import from backups/FILENAME (default: backup.sql) and OVERWRITE data
  backup                  Compressed dump into backups/auto/, then prune old ones down to
                           ${DAILY_DAYS} daily + ${WEEKLY_WEEKS} weekly + ${MONTHLY_MONTHS} monthly (for cron - see readme.txt)

Environment (from .env):
  DATABASE_NAME            Name of the main application database
  DATABASE_USER            User to connect as for 'connect'
  DATABASE_PASSWORD        Password for DATABASE_USER
  DATABASE_ROOT_PASSWORD   Root password for export/import/backup

Examples:
  $0
  $0 connect
  $0 export
  $0 export prod-2025-11-22.sql
  $0 import
  $0 import prod-2025-11-22.sql
  $0 backup
EOF
}

cmd="${1:-connect}"  # no command given - just connect
# dash (production's /bin/sh) hard-errors on `shift` with nothing left to
# shift - not just a nonzero exit `|| true` can swallow, it aborts the
# script outright - so only shift when there's actually an arg to drop.
if [ "$#" -gt 0 ]; then
  shift
fi

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

  backup)
    mkdir -p "$AUTO_BACKUP_DIR"
    TODAY=$(date +%Y-%m-%d)
    BACKUP_PATH="$AUTO_BACKUP_DIR/$TODAY.sql.gz"

    echo "Creating MySQL dump into ${BACKUP_PATH}..."

    docker compose exec -T db \
      mysqldump \
        -u root \
        -p"$DATABASE_ROOT_PASSWORD" \
        --all-databases \
        --single-transaction \
        --routines \
        --events \
      | gzip > "$BACKUP_PATH"

    echo "Done. Backup created at: $BACKUP_PATH"

    echo "Pruning old backups (keeping ${DAILY_DAYS}d daily / ${WEEKLY_WEEKS}w weekly / ${MONTHLY_MONTHS}mo monthly)..."

    now_epoch=$(date +%s)
    seen_weeks="|"
    seen_months="|"

    # Glob expansion sorts these lexicographically, which for zero-padded
    # YYYY-MM-DD names is also chronological (oldest first) - so each
    # week/month bucket below keeps its earliest backup, not an arbitrary
    # one. Recomputed from every file present on each run (not just
    # tracked incrementally), so it self-corrects regardless of gaps or a
    # missed cron run.
    for file in "$AUTO_BACKUP_DIR"/*.sql.gz; do
      [ -e "$file" ] || continue # no backups yet

      file_date=$(basename "$file" .sql.gz)
      file_epoch=$(fmt_date %s "$file_date" 2>/dev/null) || continue
      age_days=$(( (now_epoch - file_epoch) / 86400 ))

      if [ "$age_days" -le "$DAILY_DAYS" ]; then
        continue # within the daily tier, always keep
      fi

      if [ "$age_days" -le $((DAILY_DAYS + WEEKLY_WEEKS * 7)) ]; then
        bucket=$(fmt_date %G-W%V "$file_date")
        case "$seen_weeks" in
          *"|$bucket|"*)
            rm -f "$file"
            echo "  Pruned (extra for that week): $(basename "$file")"
            ;;
          *)
            seen_weeks="${seen_weeks}${bucket}|"
            ;;
        esac
        continue
      fi

      if [ "$age_days" -le $((DAILY_DAYS + WEEKLY_WEEKS * 7 + MONTHLY_MONTHS * 31)) ]; then
        bucket=$(echo "$file_date" | cut -c1-7) # YYYY-MM
        case "$seen_months" in
          *"|$bucket|"*)
            rm -f "$file"
            echo "  Pruned (extra for that month): $(basename "$file")"
            ;;
          *)
            seen_months="${seen_months}${bucket}|"
            ;;
        esac
        continue
      fi

      rm -f "$file"
      echo "  Pruned (past retention window): $(basename "$file")"
    done

    echo "Done."
    ;;

  help|-h|--help)
    print_usage
    ;;

  *)
    echo "Unknown command: $cmd"
    echo
    print_usage
    exit 1
    ;;
esac
