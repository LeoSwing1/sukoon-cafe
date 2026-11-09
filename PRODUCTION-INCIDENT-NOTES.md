# Production incident notes — 9 November 2026

This file summarizes the evidence shared during the deployment investigation. It deliberately omits passwords, tokens, cookies, database URLs, and secret values.

## Evidence verified

- Supabase project status showed Healthy.
- PostgreSQL logs showed successful connections to PostgreSQL 17.11.
- Supabase recorded successful application of five migrations for the tenant.
- SQL inspection found the Drizzle journal table at `drizzle.__drizzle_migrations`.
- SQL table checks showed the required cafe tables were present, including `users`, `cafe_settings`, `cafe_tables`, `menu_items`, `orders`, `order_items`, `inventory_items`, `staff_profiles`, and `event_bookings`.
- The owner row exists and is active, with role `OWNER`. The password hash is not included here.
- Vercel runtime logs previously reported `AUTH_SECRET must be configured before production use`. `AUTH_SECRET` was subsequently added to the API project's Production environment.
- Vercel request logs showed successful 200 responses for the public menu, tables, and cafe-settings endpoints.
- The browser showed an auth login fetch returning 200 followed by `/api/v1/auth/me` returning 401. The API source issued a `SameSite=Lax` cookie while the browser called a different `*.vercel.app` host directly.

## Root cause addressed in this release

The frontend and API were on separate Vercel hosts. The frontend made cross-site fetch requests to the API while the API issued a `SameSite=Lax` cookie. That can result in the browser not sending the session cookie on the follow-up `/auth/me` request.

The release changes production browser requests (including the admin layout session-check, recent-orders, and logout calls) to same-origin `/api/...` paths and uses a Next.js external rewrite to proxy them to the API. The session cookie remains `HttpOnly`, `Secure` in production, and `SameSite=Lax`; it no longer relies on third-party cookie behavior.

## What this release does not do

- It does not change the Supabase schema or apply migrations.
- It does not run the seed script or modify menu data.
- It does not create or change owner credentials.
- It does not embed production credentials or private logs.
