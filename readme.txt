Auto renewal cronjob:
0 3 * * * docker compose run --rm certbot renew --webroot -w /var/www/certbot --quiet && docker compose exec nginx nginx -s reload

Nightly DB backup cronjob (dumps to backups/auto/YYYY-MM-DD.sql.gz, then
prunes down to 7 daily + 4 weekly + 6 monthly - see db.sh's 'backup' command):
0 2 * * * ./db.sh backup >> backups/auto/backup.log 2>&1

