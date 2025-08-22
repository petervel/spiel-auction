Auto renewal cronjob:
0 3 * * * docker compose run --rm certbot renew --webroot -w /var/www/certbot --quiet && docker compose exec nginx nginx -s reload

