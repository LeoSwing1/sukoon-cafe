# Sukoon Cafe v2.2 — Dashboard priority and customer live sync

## Dashboard
- Moved the Live activity / Recent orders strip above the admin page content so it is visible immediately when staff open an admin workspace.
- Moved the dashboard Recent orders table directly below the summary KPI cards, ahead of sales analytics.
- Dashboard order polling now refreshes every 5 seconds.

## Customer-facing sync
- Public QR/customer menu refreshes menu availability, prices, cafe settings and table metadata every 8 seconds without a manual refresh.
- Public cafe homepage refreshes cafe profile/settings every 15 seconds.
- Customer order tracking refreshes status every 5 seconds after an order is found, including the served stage.
- Requests use no-store fetches to avoid stale browser cache responses.

## Notes
- This is near-real-time polling, not a persistent WebSocket connection. Updates appear within the polling interval while the customer page remains open and connected.
- No new database migration or seed is required.
- Existing `.env`, PostgreSQL database and Docker volume are preserved.
