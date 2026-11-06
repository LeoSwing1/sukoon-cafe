SUKOON CAFE — API IMPLEMENTATION ADD-ON

This add-on contains Express route modules for menu management and order management.

Menu endpoints:
GET /api/v1/menu-items
POST /api/v1/menu-items
PATCH /api/v1/menu-items/:id

Order endpoints:
GET /api/v1/orders
POST /api/v1/orders

Order creation validates source and line items, requires the external order ID for Swiggy/Zomato manual entry, calculates tax/discount/total on the server, snapshots item names/prices, and writes the order and lines in one database transaction.

Integration into the starter:
1. Copy apps/api/src/routes into the matching location in the starter project.
2. Import menuRouter and ordersRouter in apps/api/src/server.ts.
3. Mount them with app.use('/api/v1/menu-items', menuRouter) and app.use('/api/v1/orders', ordersRouter).
4. Ensure the DB schema exports `items`, `categories`, `orders`, and `orderLines` with the fields used by these routes.

This is not production-ready by itself. Authentication/authorization, idempotency keys, rate limits, platform webhook integration, payment reconciliation, receipt printing, audit trails, backup/export jobs and automated tests must be added before live use. Never delete financial source records after 10 days; retain invoices and accounting evidence according to applicable requirements.
