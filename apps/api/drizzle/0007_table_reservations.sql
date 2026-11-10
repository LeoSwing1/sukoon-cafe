CREATE TABLE IF NOT EXISTS table_reservations (
  id serial PRIMARY KEY,
  reservation_number varchar(48) NOT NULL UNIQUE,
  reservation_date date NOT NULL,
  reservation_time varchar(5) NOT NULL,
  guest_count integer NOT NULL CHECK (guest_count BETWEEN 1 AND 30),
  customer_name varchar(120) NOT NULL,
  customer_phone varchar(30) NOT NULL,
  customer_email varchar(255),
  seating_preference varchar(20) NOT NULL DEFAULT 'ANY',
  special_requests text,
  reservation_status varchar(20) NOT NULL DEFAULT 'REQUESTED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS table_reservations_date_status_idx
  ON table_reservations (reservation_date, reservation_status);
CREATE INDEX IF NOT EXISTS table_reservations_phone_idx
  ON table_reservations (customer_phone);

-- Keep direct anonymous/authenticated Supabase client access closed.
-- The application backend uses its server-side database connection.
ALTER TABLE table_reservations ENABLE ROW LEVEL SECURITY;
