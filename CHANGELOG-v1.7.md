# Sukoon Cafe v1.7 — Order flow and admin activity

- Added an explicit `orderId` field to the successful order-creation API response.
- POS now validates the returned order identifier before redirecting, instead of navigating to `/admin/orders/undefined`.
- Added a shared Recent orders activity panel to the bottom of every permitted admin workspace page. It refreshes every 10 seconds and links to order details, KOT and invoice printing.
- Receipt route now gives a clear recovery message for missing/non-numeric order IDs rather than making an invalid API request.

No database migration is required. Existing `.env` values and the PostgreSQL data volume are not modified.
