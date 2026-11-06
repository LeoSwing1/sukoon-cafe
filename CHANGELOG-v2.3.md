# Sukoon Cafe v2.3 — Customer order type cleanup

- Replaced the customer-facing “Order online” option with “Dine in”.
- Customer menu now exposes only Dine in and Takeaway.
- Dine-in is enabled by a valid table QR token; without a table QR, the option explains that the customer must scan their table QR.
- Takeaway customer submissions are stored as TAKEAWAY requests, remain payment-pending, and require staff approval before entering the kitchen.
- Staff customer-request queue now includes pending TAKEAWAY requests alongside legacy WEBSITE requests.
- Kitchen board excludes unapproved customer TAKEAWAY requests.
- Customer order tracking supports TAKEAWAY as well as legacy WEBSITE references.

No database schema changes or seed changes are required.
