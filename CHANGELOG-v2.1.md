# Sukoon Cafe v2.1 — Dine-in running table tabs

- Adds order-item KOT batch numbers and kitchen status fields.
- Adds authenticated open-table lookup for staff/service roles.
- Adds a staff add-items endpoint for an active dine-in tab. New items append to the existing order and invoice totals are recalculated; the response identifies the new KOT batch.
- Adds an order-detail add-items interface that prints only the newly added KOT batch.
- Expands order read access to SERVICE role.

Apply the included migration with `npm run db:migrate`. Existing orders and database volume are preserved.
