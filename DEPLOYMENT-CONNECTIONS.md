# Sukoon Cafe — production connection and auth fix

This release keeps the existing cafe functionality, database schema, menu, POS, kitchen/KOT, invoices, inventory, bookings, expenses, staff roles, marketplace configuration, settlements, and Windows print-agent source. It changes the browser-to-API transport so the session cookie is first-party.

## Root cause addressed

The deployed frontend and API use separate `*.vercel.app` hosts. The original browser code called the API host directly while the API issued an `HttpOnly; SameSite=Lax; Secure` session cookie. The login POST could return 200, but a subsequent cross-site `fetch` could omit that cookie, so `/api/v1/auth/me` returned 401.

Production browser calls now use relative `/api/...` URLs. `apps/web/next.config.ts` rewrites those requests server-side to the API deployment. The browser therefore talks to its own frontend origin, and the session cookie is stored and sent as a first-party cookie. The cookie remains `HttpOnly`, `Secure` in production, and `SameSite=Lax`. Auth/setup responses are also marked `no-store`.

## Vercel configuration

### Project: `sukoon-cafe-api` (Root Directory: `apps/api`)

Set these variables in **Production** (and Preview if you deploy preview builds):

- `DATABASE_URL` = the rotated Supabase Transaction Pooler URI. Do not put it in source control.
- `AUTH_SECRET` = a fresh random secret of at least 32 characters. Generate locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Do not share or commit it.
- `WEB_ORIGIN` = `https://sukoon-cafe-web.vercel.app` (or the exact frontend production origin assigned to your project).

### Project: `sukoon-cafe-web` (Root Directory: `apps/web`)

Set this non-public build variable in **Production** (and Preview if applicable):

- `API_PROXY_ORIGIN` = `https://sukoon-cafe-api.vercel.app`

`NEXT_PUBLIC_API_URL` is no longer needed in production. The app ignores it in production and uses same-origin `/api` requests. Remove the old `NEXT_PUBLIC_API_URL` from the frontend Vercel project after adding `API_PROXY_ORIGIN`, then redeploy the frontend.

## Local development

- Keep `apps/api/.env` for the local Docker database.
- Copy `apps/api/.env.example` to `apps/api/.env` and set a local `DATABASE_URL` plus a local `AUTH_SECRET`.
- Copy `apps/web/.env.example` to `apps/web/.env.local`.
- Local API target defaults to `http://localhost:4100`.

## Safe deployment sequence

1. Update API environment variables (do not change the existing Supabase schema).
2. Redeploy `sukoon-cafe-api`. Confirm `/health` reports `database: connected`.
3. Add `API_PROXY_ORIGIN` to `sukoon-cafe-web`, remove the old `NEXT_PUBLIC_API_URL`, and redeploy the frontend.
4. Open `https://sukoon-cafe-web.vercel.app/login`, sign in, and verify Network requests use the frontend host path `/api/v1/auth/login` and `/api/v1/auth/me`.
5. Confirm `/api/v1/auth/me` returns 200 after login, then check menu, tables, settings, POS, KOT/invoice, inventory and admin modules.

## Important data and security notes

- Do not run `db:seed` against production; the seed script changes menu availability and inserts menu records.
- Do not reset Supabase or rerun migrations just to fix authentication. Your existing database tables and Drizzle journal should be preserved.
- Real `.env`, `.env.production`, database passwords, `AUTH_SECRET`, cookies, API keys and staff passwords are intentionally excluded from this archive. Keep them only in Vercel environment variables or local ignored `.env` files.
- Passwords previously pasted into chat should be rotated before continuing.
- This archive contains no live credentials and no deployment logs with tokens/cookies. Vercel logs are operational output and should be reviewed in the dashboard; never embed them in source.
