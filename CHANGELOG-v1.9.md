# Sukoon Cafe v1.9 — Windows Printing & Marketing Exports

- Added a local Windows print agent (`tools/windows-print-agent`) that enumerates Windows-installed printer queues and submits receipt/KOT text jobs through the Windows print spooler.
- Admin printer setup can refresh Windows queues and assign separate receipt and kitchen printers; includes test print controls.
- Receipt/KOT sends to the local agent first and falls back to browser print when the agent is unavailable.
- Added owner/manager-only CSV exports for customer visit/value segments and order/discount/staff history.
- Receipt includes cafe identity, configured address/phone/opening hours, order date/time, customer/table and cashier attribution where the order record contains it.

## Hardware compatibility
Connect USB or pair Bluetooth in Windows, install the manufacturer's driver, and confirm a Windows printer queue exists. This implementation uses Windows' installed printer driver/spooler, not a universal raw ESC/POS driver. It cannot promise model-specific cutter, cash-drawer, buzzer, logo raster or Bluetooth Classic support for every printer. Exact model and driver are needed to add those capabilities safely. Browser print is the fallback.
