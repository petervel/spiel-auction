#!/bin/sh
export $(grep -v '^#' .env | xargs)
docker compose exec db mysql -u"$DATABASE_USER" -p"$DATABASE_PASSWORD" auctions
