SUKOON CAFE — SAFE INITIAL MENU SEED PATCH

This patch replaces only:
  apps/api/src/db/seed.ts

What it does:
- Adds the 18 supplied menu categories and 99 menu items when they are missing.
- Adds table numbers 1–10 when they are missing.
- Adds one default cafe_settings row only when no settings row exists.
- Marks catalogue items as real records (demoData=false).
- Preserves existing menu items, owner-managed prices, availability, and settings.
- Does NOT create demo orders, invoices, expenses, inventory, staff, suppliers,
  promotions, platform settlements, or an owner login.
- Is safe to rerun: it skips existing menu items and table numbers.

Apply from Windows CMD:

  cd /d C:\CURRENT-PROJECTS\sukoon-cafe
  copy apps\api\src\db\seed.ts apps\api\src\db\seed.ts.before-safe-seed.bak

Extract this ZIP and overwrite the matching file at:
  C:\CURRENT-PROJECTS\sukoon-cafe\apps\api\src\db\seed.ts

Then run:

  cd /d C:\CURRENT-PROJECTS\sukoon-cafe\apps\api
  npm run build
  npm run db:seed

Before running, confirm apps/api/.env DATABASE_URL points to the local Docker DB:
  host 127.0.0.1, port 5433, database sukoon_cafe

Do not run against production Supabase unless you intentionally want to add
this initial catalogue and ten table records to production.

Expected output includes:
  Starting Sukoon Cafe initial data import...
  Sukoon Cafe initial data import completed.
  Categories added: 18
  Menu items added: 99
  Tables added: 10
  Cafe settings created: yes

If rerun, added counts may be zero because records already exist.
