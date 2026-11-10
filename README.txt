SUKOON CAFE — KITCHEN QUICK ACTIONS

This ZIP is structured to extract directly into your project root:
C:\CURRENT-PROJECTS\sukoon-cafe

Included files:
- apps/web/src/app/admin/kitchen/page.tsx
  Complete replacement for the Kitchen Board UI.
- apply-kitchen-quick-actions.cjs
  Adds POST /api/v1/orders/:id/pickup to apps/api/src/routes/orders.ts.

Apply:

1. From CMD, back up current files:
   cd /d C:\CURRENT-PROJECTS\sukoon-cafe
   copy apps\web\src\app\admin\kitchen\page.tsx apps\web\src\app\admin\kitchen\page.tsx.backup
   copy apps\api\src\routes\orders.ts apps\api\src\routes\orders.ts.backup

2. Extract this ZIP directly into the project root and allow the Kitchen page to be replaced.

3. Run the API patch script from the project root:
   node apply-kitchen-quick-actions.cjs

4. Build:
   npm run build

5. Test locally before committing.

Workflow:
- PREPARING: Kitchen staff can tap Mark Ready. Uses the existing PATCH /orders/:id/status endpoint.
- READY: Cashier/service can tap Picked Up & Collect Payment.
- The confirmation dialog records either PAID (with selected method) or PENDING and moves READY -> SERVED in one database transaction.
- SERVED with PENDING payment shows Collect Payment for cashier/service.
- The existing invoice print workflow continues to move the order to COMPLETED.
- Payment collection is manually confirmed by staff. This does not charge a card or UPI account automatically.

Permissions:
- Mark Ready uses the existing status endpoint and is available to OWNER, MANAGER, CASHIER, KITCHEN and SERVICE as defined by that endpoint.
- Pickup/payment endpoint is limited to OWNER, MANAGER, CASHIER and SERVICE. KITCHEN users see a waiting note instead.

No database schema change or migration is required. The endpoint uses existing orders, invoices, order_status_events and audit_logs tables.
