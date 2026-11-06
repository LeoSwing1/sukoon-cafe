# Sukoon Cafe v2.0 — Website Order Verification

- Website orders are created as RECEIVED requests with payment forced to PENDING.
- Added staff-only pending website order queue at Admin → Website orders.
- Cashier/manager/owner can accept or reject; acceptance moves the order to ACCEPTED and routes it into the kitchen board; rejection moves it to CANCELLED.
- Kitchen board explicitly excludes unaccepted website requests.
- Pending website orders do not expose a KOT print action on the order detail page.
- Added public order tracking by order reference at /track-order and a menu navigation link.
- Added audit log entries for order creation, status changes and payment updates, including staff identity when authenticated.
- Website customer receives an acknowledgement that explicitly says the request is not confirmed until accepted.

## Deliberate safeguards / remaining provider integrations
- Online orders do not become PAID automatically and do not auto-print a final invoice.
- Phone OTP/SMS verification is not enabled because no SMS/OTP provider credentials were supplied. A customer phone number is captured but is not treated as verified.
- CAPTCHA / distributed rate limiting and automated customer messaging require provider/configuration work before production.
- No schema migration is needed: this uses existing order status, status-event and audit-log tables.
