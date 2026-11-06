# Sukoon Cafe v1.8 — Billing & Printer Foundations

- POS supports fixed-rupee and percentage discounts.
- Order records persist discount type/value and the signed-in staff member's name, role and user ID.
- Invoice/KOT screen prints the bill creator attribution.
- Added Printer Setup screen with user-initiated USB and BLE device discovery, 58mm/80mm selection, local print-bridge health check and browser print fallback.
- Added migration `0005_billing_discounts_staff.sql`.

## Important hardware limitation
WebUSB/Web Bluetooth device discovery does not guarantee ESC/POS printing. Web Bluetooth generally cannot access Bluetooth Classic printers, which are common among thermal printers. Silent/reliable direct printing requires a locally installed print agent/driver matched to the actual printer model. The UI probes `http://127.0.0.1:8787` for a compatible local print service; this project does not bundle or install that privileged native service. Until one is installed, test printing uses the browser/OS print dialog.
