-- Optional legacy helper (no longer required for login).
-- Login now maps phone → internal auth email in the app; phone is plain text in customers.

-- Ensure customers.phone exists as a text column for profile storage
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS customers_email_key ON public.customers (email);
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_key ON public.customers (phone);
