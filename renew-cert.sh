#!/bin/bash
# renew-cert.sh

# Renew certificates
docker compose run --rm certbot renew

# Reload nginx to pick up new certificates
docker compose exec nginx nginx -s reload