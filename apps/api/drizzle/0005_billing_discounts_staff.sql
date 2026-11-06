ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_type varchar(10) NOT NULL DEFAULT 'FIXED',
  ADD COLUMN IF NOT EXISTS discount_value integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by_user_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS created_by_name varchar(120),
  ADD COLUMN IF NOT EXISTS created_by_role varchar(40);
