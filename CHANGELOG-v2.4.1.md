# Sukoon Cafe v2.4.1 — same-origin authentication session proxy

- Route browser API requests through the frontend origin using a Next.js rewrite to the Express API.
- Keep the `sukoon_session` cookie first-party while retaining `HttpOnly`, `Secure` in production, and `SameSite=Lax`.
- Update the admin layout's recent-orders, session-check, and logout requests to use the same-origin API path as the other frontend modules.
- Add safe API request logs with method, path, status, duration, and Vercel request ID; do not log request bodies, passwords, or cookies.
- Add no-store behavior for authentication requests.
- No database migration, seed, schema reset, or owner password change is included.
