ALTER TABLE order_items ADD COLUMN IF NOT EXISTS batch_number integer NOT NULL DEFAULT 1;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS kitchen_status varchar(20) NOT NULL DEFAULT 'PENDING';
CREATE INDEX IF NOT EXISTS order_items_order_batch_idx ON order_items(order_id, batch_number);
