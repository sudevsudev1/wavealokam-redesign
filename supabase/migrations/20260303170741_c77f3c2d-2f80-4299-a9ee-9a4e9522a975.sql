
-- Add columns for domestic and international check-in form fields
ALTER TABLE public.ops_guest_log
  ADD COLUMN guest_type text NOT NULL DEFAULT 'domestic',
  ADD COLUMN address text,
  ADD COLUMN city text,
  ADD COLUMN state text,
  ADD COLUMN pincode text,
  ADD COLUMN arriving_from text,
  ADD COLUMN heading_to text,
  ADD COLUMN date_of_birth text,
  ADD COLUMN passport_number text,
  ADD COLUMN evisa_number text,
  ADD COLUMN nationality text,
  ADD COLUMN payment_mode text,
  ADD COLUMN transaction_id text,
  ADD COLUMN number_of_nights integer;
