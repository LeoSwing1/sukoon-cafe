ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone varchar(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_instructions text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method varchar(40) NOT NULL DEFAULT 'CASH';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_subtotal_paise integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_commission_paise integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_notes text;
