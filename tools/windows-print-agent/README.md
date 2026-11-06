# Sukoon Windows Print Agent

1. Pair the Bluetooth printer in Windows Settings → Bluetooth & devices, or connect USB.
2. Install the manufacturer's Windows printer driver. Confirm it appears in Settings → Printers & scanners and print a Windows test page.
3. Install Node.js 20+ on the billing PC.
4. Double-click `start-agent.cmd`.
5. Keep the agent running while POS is in use. It listens only on `127.0.0.1:8787`.
6. Open Admin → Printers, refresh printers, select the customer receipt and kitchen KOT printers, and test each.

This agent uses the Windows print spooler and the installed printer driver. It does not bypass the driver or guarantee cutter, drawer-kick, buzzer, logo raster or other vendor-specific ESC/POS features. Those require a compatible model/driver/ESC-POS integration. Windows must show Bluetooth printers as an installed printer queue; some devices expose only a COM port and need a model-specific driver. Do not expose the agent to the LAN or internet.
