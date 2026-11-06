ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS cost_paise integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS inventory_items (
 id serial PRIMARY KEY, name varchar(160) NOT NULL, unit varchar(30) NOT NULL DEFAULT 'pcs',
 stock_quantity numeric(12,3) NOT NULL DEFAULT 0, reorder_level numeric(12,3) NOT NULL DEFAULT 0,
 unit_cost_paise integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory_movements (
 id serial PRIMARY KEY, inventory_item_id integer NOT NULL REFERENCES inventory_items(id),
 movement_type varchar(20) NOT NULL CHECK (movement_type IN ('PURCHASE','USAGE','WASTAGE','ADJUSTMENT')),
 quantity numeric(12,3) NOT NULL, note text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS suppliers (
 id serial PRIMARY KEY, name varchar(160) NOT NULL, phone varchar(40), email varchar(255),
 notes text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS promotions (
 id serial PRIMARY KEY, name varchar(160) NOT NULL, code varchar(60) UNIQUE,
 description text, discount_type varchar(20) NOT NULL DEFAULT 'PERCENT',
 discount_value integer NOT NULL DEFAULT 0, starts_at timestamptz, ends_at timestamptz,
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_settings (
 id serial PRIMARY KEY, platform varchar(20) NOT NULL UNIQUE,
 enabled boolean NOT NULL DEFAULT false, api_base_url text, api_key text, api_secret text,
 webhook_url text, notes text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS staff_profiles (
 id serial PRIMARY KEY, name varchar(120) NOT NULL, email varchar(255), phone varchar(40),
 role varchar(40) NOT NULL DEFAULT 'EMPLOYEE', active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settlement_records (
 id serial PRIMARY KEY, platform varchar(20) NOT NULL, reference varchar(120),
 gross_paise integer NOT NULL DEFAULT 0, commission_paise integer NOT NULL DEFAULT 0,
 adjustment_paise integer NOT NULL DEFAULT 0, net_paise integer NOT NULL DEFAULT 0,
 settlement_status varchar(30) NOT NULL DEFAULT 'PENDING', settled_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cafe_expenses (
 id serial PRIMARY KEY, category varchar(100) NOT NULL, description text NOT NULL,
 amount_paise integer NOT NULL CHECK(amount_paise >= 0), expense_date date NOT NULL DEFAULT CURRENT_DATE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_movements_item_idx ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS cafe_expenses_date_idx ON cafe_expenses(expense_date);
INSERT INTO marketplace_settings(platform,enabled,notes) VALUES
 ('SWIGGY',false,'API credentials intentionally blank. Configure only after authorized partner access.'),
 ('ZOMATO',false,'API credentials intentionally blank. Configure only after authorized partner access.')
ON CONFLICT(platform) DO NOTHING;
