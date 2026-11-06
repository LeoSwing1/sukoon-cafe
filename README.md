# Sukoon Cafe — v1.5.0

## Run locally
Keep the existing Docker volume and `.env` files. The database uses the dedicated host port 5433 configured by `fix-local-db.cmd`.

```cmd
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000/login`. On the first visit, create the owner account with a valid email and a password of at least 10 characters. This is a one-time setup; after an owner exists, setup is closed and all subsequent visits require sign-in.

## Access model
- OWNER: full admin dashboard, settings, staff accounts, catalogue, tables/QR, financials and integrations.
- MANAGER: operational dashboard, orders, kitchen, catalogue, tables, inventory, expenses, settlements, promotions and event bookings. No owner account creation, staff management or secret integrations.
- CASHIER / SERVICE: restricted POS and stock workspace only.
- KITCHEN: kitchen board and ticket status updates only.

The API validates the signed HttpOnly session and checks the user's active status and role on protected requests. Employee accounts are created by the owner from Admin → Team with a unique email, password and assigned role. Deactivating a staff profile also disables the matching login.

## Customer experience
- Public customer menu and website remain accessible without staff sign-in.
- Table QR URLs include a per-table token. Public table lookup does not reveal those tokens.
- Public website and takeaway orders remain available; dine-in QR orders require the table token. Walk-in counter orders require a staff session. POS orders require a staff session.
- Event enquiries remain public; reading and managing event bookings requires an owner/manager session.

## Menu
The seed catalogue follows the photographed Sukoon Diaries sections: Cold Coffee, Chai & Adrak, Maggi, Momos, Burgers, Sandwiches, Mojitos, Special Tea and Funny Mocktail Combos. Unrelated starter placeholders are marked unavailable. Sample costs are illustrative and must be replaced with real recipe costs.

## Production checklist
Before public deployment, set a unique random `AUTH_SECRET`, use HTTPS, configure the exact `WEB_ORIGIN`, rotate any demo credentials, review tax settings and printer configuration, and complete an end-to-end build/test on the deployment environment. Swiggy/Zomato API credentials remain configurable placeholders; no official marketplace connection is claimed until authorised credentials and partner access are provided.


## v1.5.2 entry-point correction
- Public website `Staff login` / `Cafe team` entry now opens `/login`, never `/admin` directly.
- Cafe details link now opens the staff login entry rather than exposing a direct admin URL.
- Login checks an existing session and routes the signed-in user to the correct workspace: owner/manager admin, cashier/service POS, or kitchen board.
- This corrects the customer-to-staff entry path; role enforcement remains in the protected admin layout and API middleware.


## v1.6.0 — Expanded demo catalogue and menu experience
- Expanded seeded categories to include fresh juices, soft drinks and water, hot coffee, fries and quick bites, pizza and pasta, starters and small plates, main course, desserts and cakes, and breakfast/all-day.
- Added illustrative sample items and estimated recipe costs. Prices are demo placeholders and must be confirmed by the cafe before publishing.
- Reworked customer menu discovery with category tiles, category descriptions/emoji artwork, product-card hierarchy, item counts, improved hover states and a useful empty state.
- Seed remains additive: it creates missing categories and products, and updates matching existing sample products. It does not delete orders or invoices.
- Swiggy/Zomato partner APIs, payment gateways, printer hardware, WhatsApp/SMS and delivery aggregators require real provider credentials and/or hardware; demo fields are not live integrations. Keep credentials blank until the cafe obtains authorised access.

## v1.7 order-flow fixes

See `CHANGELOG-v1.7.md`. The admin workspace now includes a shared Recent orders panel across admin pages. Order creation returns an explicit `orderId`, the POS validates it before navigation, and invalid receipt IDs show a useful recovery message. No database migration is needed. Keep your existing `.env` and Docker volume unchanged.


## v1.8 billing and printer setup
Run `npm run db:migrate` once after applying v1.8. POS now accepts percentage and fixed-rupee discounts and stores the signed-in staff member on each order. Open Admin → Printers to discover supported USB/BLE devices, choose 58mm or 80mm paper and run a test print. Browser print is the fallback. For automatic silent printing, install a trusted local ESC/POS print agent configured on `127.0.0.1:8787`; the app only detects/probes this service and does not install it. Web Bluetooth does not support many Bluetooth Classic thermal printers, so confirm the exact printer model before purchasing.


### Local print-agent contract
The web app probes `GET http://127.0.0.1:8787/health` and sends test jobs to `POST /print/test`. Receipt/KOT pages send `POST /print` with JSON `{ type, orderId, paperWidthMm, order, lines, invoice, cafe, table }`. The agent must validate local-origin requests, render ESC/POS safely, select the configured receipt/KOT printer, and return a 2xx response only after queuing the job. Do not expose this unauthenticated service to the public network. If the agent is absent or fails, the browser print dialog is used.


## v2.0 website order verification
Website orders are unconfirmed requests. Staff can review them at Admin → Website orders and accept/reject them. Only accepted website orders enter the kitchen board. Customers can track their website request at `/track-order` using the order reference. Website requests are forced to payment status PENDING. The acknowledgement is not a tax invoice or confirmation.

Phone OTP/SMS and CAPTCHA are not active until provider credentials/configuration are supplied. Do not describe a phone number as verified merely because it was entered. No migration or seed is required for this release.


## v2.1 Dine-in running table tabs

Apply `npm run db:migrate` after updating. Staff can open an existing dine-in order and add more items from its order detail page. The running customer invoice is updated and the new items are assigned a new KOT batch. The new migration only adds columns and an index; it does not delete or reseed data.


## v2.3 customer order types

The customer menu offers only **Dine in** and **Takeaway**. Dine-in is tied to a valid table QR token. Takeaway submissions are queued for staff approval and are not sent to the kitchen until accepted. Legacy WEBSITE orders remain supported for existing records. No migration or seed is required.


## v2.4 customer menu polish
- Dine in is selected by default on a fresh menu visit; a valid table QR token is still required to submit a dine-in order.
- Removed the non-interactive oversized cart heading.
- Takeaway remains available as the alternate order type.
- No database migration or seed is required.
