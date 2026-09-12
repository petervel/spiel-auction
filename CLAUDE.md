# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Spiel Auctions is a tool for tracking BoardGameGeek (BGG) "geeklist" auctions during board game fairs (e.g. Spiel Essen). BGG geeklists are periodically fetched as XML, parsed, and stored in MySQL so the frontend can show a searchable, sortable, near-real-time view of auction items, bids, and bidders — things BGG's own geeklist UI doesn't support well.

## Architecture

Four independently deployed pieces, tied together only through the shared MySQL database and a shared Docker volume of XML files:

- **`xml-fetcher/`** — a single long-running Node script (`fetchXml.ts`) with no framework. Polls the DB every 5 minutes for `Fair`s with `status = ACTIVE`, and runs one fetch loop per fair's `geeklistId` against `boardgamegeek.com/xmlapi/geeklist/{id}?comments=1`. Writes each fetched XML to a shared volume as `data-{geeklistId}-{timestamp}.xml`, keeping only the 3 newest per geeklist. Backoff/rate-limit handling here is load-bearing and tuned from production incidents (BGG bans on sustained sub-10-minute polling) — read the comments in `fetchXml.ts` before changing any interval constant.
- **`backend/`** — TypeScript/Express API + a separate importer process, sharing one codebase/image but two entrypoints (`cli-api.ts`, `cli-importer.ts`) and started as two containers (`auctions-backend-api`, `auctions-backend`) from the same `spiel-auction-backend` image.
  - **Importer** (`src/importer/updateData.ts`, run every minute by `node-cron` in `cli-importer.ts`): for each due `Fair`, finds the newest XML file for its `geeklistId` on the shared volume, skips if unchanged (`Fair.latestFile`), parses it, and upserts `List`/`Item`/`ListComment`/`ItemComment` rows via `ListWrapper`/`ItemWrapper`/`ListCommentWrapper` (in `src/importer/processors/`). `Fair.lastResult`/`startedAt` act as a lock (`RUNNING` + timeout) so overlapping cron ticks don't double-process a fair. After a successful import it also fires best-effort side effects: outbid/won push notifications (`notifications/outbidNotifier.ts`) and auto-liking items for first-time bidders (`likedItems.ts`) — both are caught individually so a failure there never fails the import itself.
  - **API** (`src/api/*`, mounted under `/api/*` in `src/server.ts`): one Express router per resource. Auth is a JWT in an httpOnly `session` cookie (`src/session.ts`, `middleware/auth.ts`); login is via Google OAuth or a passwordless magic-link email (`src/magicLink.ts`, `src/email.ts` via Resend). Item/list-scoped GET routes are Redis-cached (`src/api/redisClient.ts`, ~30s TTL, keyed by query params) and paginated with a cursor (`lastId`) + `take: PAGE_SIZE + 1` "is there more" trick, not offset paging.
  - **Multi-fair model**: `Fair` is the top-level entity (one per BGG geeklist/event); `List`/`Item`/comments belong to a `Fair` via `List.id === Fair.geeklistId`. A `User` has many `UserFair` join rows and one `currentUserFairId` pointing at their active fair (`src/currentFair.ts` — auto-assigns the env-configured default fair on first login only, and must never silently override a user's later choice). `DEFAULT_GEEKLIST_ID` (read via `src/api/useListId.ts`) is that default fair for new users, not a hardcoded "the" fair.
  - A route/lookup returning 404 for an item/list ID distinguishes "no such fair" from "fair exists but hasn't completed its first import yet" via `{ error: "not_ready" }` (`src/api/listLookup.ts`) — the frontend (`hooks/fetchList.ts`) treats that as a distinct, non-retried state rather than a hard error.
- **`frontend/`** — React 19 + Vite + MUI SPA, installable as a PWA. `react-query` for server state (no Redux/global fetch cache beyond it); React Context (`src/contexts/`) + small provider components (`src/providers/`) for cross-cutting client state (auth user, bookmarked/current fair, color mode). Routing is `react-router-dom` (`src/AppRouter.tsx`); most pages sit inside `TabLayout` (bottom tab navigation). The service worker (`src/sw.ts`) is hand-written and injected via `vite-plugin-pwa`'s `injectManifest` strategy (not the default `generateSW`) specifically so it can also handle Web Push (`notificationclick`/`push` listeners) — don't switch this back to `generateSW` without re-adding that.

## Commands

There's no root package.json — each of `backend/`, `frontend/`, `xml-fetcher/` is its own yarn project.

### Backend (`backend/`)
- `yarn dev:api` — run the API with ts-node (hot-reload via `dev`/`--watch` variants also exist)
- `yarn dev:importer` — run the importer loop with ts-node
- `yarn build` — `tsc` compile to `dist/`
- `yarn start:api` / `yarn start:importer` — run compiled output (used in Docker)
- `yarn test` — run the vitest suite (`src/importer/__tests__/*.test.ts`); `yarn test <path>` or vitest's own filtering runs a single file/case
- Prisma: schema at `backend/prisma/schema.prisma`, uses the `driverAdapters` preview feature with `@prisma/adapter-mariadb`. `npx prisma migrate dev` to create a migration locally, `npx prisma migrate deploy` to apply (also run automatically by `entrypoint.sh` / the `auctions-backend-api` compose command on container start — falls back to `prisma db push --accept-data-loss` only if no migrations folder exists yet)

### Frontend (`frontend/`)
- `yarn dev` — Vite dev server (expects to run behind the dev nginx proxy on :8081, see below)
- `yarn build` — typecheck (`tsc -b`) + production build
- `yarn lint` — ESLint

### xml-fetcher (`xml-fetcher/`)
- `yarn build` then `node dist/fetchXml.js`, or run directly via the Docker service

### Full stack (Docker Compose)
- Dev: `docker compose -f docker-compose.yml -f docker-compose.override.yml up` — bind-mounts source for hot reload, serves everything through an nginx dev proxy on `localhost:8081` (`nginx/nginx.dev.conf`), uses a local `spiel-auction-dev` network.
- Prod: `docker compose up` (the override file is dev-only) — builds fixed images, backend API runs migrations then starts, external `web` network (shared with an external reverse proxy/certbot setup — see `certbot/`, `letsencrypt/`, the cron line in `readme.txt`).
- `./db.sh connect|export|import` — connect to the compose MySQL as the app user, or dump/restore all databases (destructive; asks for confirmation on import).

Environment variables for all three services are documented in `.env-example` at the repo root; `backend/` and `frontend/` also have their own local `.env`/`.env-example`/`.env.local` for running outside Docker.

## Conventions worth knowing before editing

- Backend uses tabs (see `backend/.prettierrc`); frontend uses its own `.prettierrc` — run each project's own formatter, don't assume repo-wide settings.
- Fallible operations in the importer pipeline use an explicit `Result`/`ok`/`err` type (`backend/src/importer/util/result.ts`) rather than throwing, so callers can distinguish "no new data" from a real failure without a try/catch. Keep using that pattern in importer code rather than introducing exceptions for expected outcomes.
- Comments in this codebase tend to record *why* a non-obvious constant or ordering was chosen (often citing a specific production incident) — when you find one before touching that code, read it fully before changing the value; several intervals (BGG polling backoff, cache TTLs, lock timeouts) look arbitrary but are tuned from observed BGG behavior.
