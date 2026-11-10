# Sukoon Diaries — public website and reservations update

This package upgrades the public-facing website and adds a real table-reservation workflow while reusing the existing live menu and event-booking services.

## Included

- Redesigned `/` homepage: cafe story/portfolio, experience sections, live menu highlights, visit information and clear customer journeys.
- `/reserve`: table reservation request form connected to `POST /api/v1/table-reservations`.
- `/catering`: catering enquiry form connected to the existing `POST /api/v1/event-bookings` endpoint using `venuePreference: OFFSITE`.
- `/admin/reservations`: staff reservation queue with request status management.
- API route `apps/api/src/routes/reservations.ts`.
- Database migration `apps/api/drizzle/0007_table_reservations.sql`.
- Patch script registers the API route, adds the admin navigation link, expands manager/cashier permissions, and updates the Drizzle journal.
- Updated website metadata.

## Before applying

1. Make sure the project is at `C:\CURRENT-PROJECTS\sukoon-cafe`.
2. Back up the files listed in the commands below.
3. Extract this ZIP into the project root, preserving the folder structure.

```cmd
cd /d C:\CURRENT-PROJECTS\sukoon-cafe
copy apps\web\src\app\page.tsx apps\web\src\app\page.tsx.backup
copy apps\web\src\app\layout.tsx apps\web\src\app\layout.tsx.backup
copy apps\web\src\app\admin\layout.tsx apps\web\src\app\admin\layout.tsx.backup
copy apps\api\src\server.ts apps\api\src\server.ts.backup
copy apps\api\drizzle\meta\_journal.json apps\api\drizzle\meta\_journal.json.backup
```

## Apply the wiring patch

After extracting the ZIP into the project root:

```cmd
node apply-public-site-update.cjs
```

The script is intended to be idempotent. It checks each expected code marker before editing. If it stops because a marker differs, do not force it; share the error so the current file can be reconciled safely.

## Local database migration

The new table reservation feature requires one database migration. Your local app uses Docker PostgreSQL on port 5433.

```cmd
docker compose up -d postgres
docker compose ps
npm run db:migrate
```

Do not run the menu seed again. This update does not need any menu data changes.

## Production Supabase migration

Before deploying the API code, open Supabase SQL Editor and execute the contents of:

`apps/api/drizzle/0007_table_reservations.sql`

This creates only `table_reservations`, adds indexes and enables RLS. It does not modify the existing menu, orders, invoices, users, or event bookings. The API uses its server-side database connection; do not create an anonymous policy for customer reservations.

## Build and test

```cmd
npm run build
npm run dev
```

Test these journeys locally:

1. Homepage -> Digital menu -> existing menu ordering.
2. Homepage -> Reserve a table -> submit a request -> see `REQUESTED` in `/admin/reservations`.
3. Confirm that staff can change it to `CONFIRMED`, `SEATED`, `COMPLETED`, `CANCELLED` or `DECLINED`.
4. Homepage -> Celebrations -> the existing event-booking form.
5. Homepage -> Catering -> submit an off-site catering enquiry and verify it appears in the existing event-bookings admin workflow.

Reservation submissions are requests, not confirmed bookings. The cafe must confirm availability with the guest.

## Deploy

1. Run `npm run build` successfully.
2. Apply the new SQL migration to production Supabase.
3. Review `git status --short` and `git diff --check`.
4. Commit only the intended source files and migration/journal updates; never stage `.env`, `.env.production`, database credentials, or backup files.
5. Push to the branch connected to Vercel.
6. Verify the frontend and API deployment; test the reservation form and admin queue.

No payment gateway, live Swiggy/Zomato ordering API, Instagram feed, WhatsApp Cloud API or Google Maps API is configured by this package. Existing contact details from Cafe Settings are displayed where available; catering and party requests are enquiry workflows that staff must confirm.
