ALTER TABLE public.ops_inventory_items 
  ADD COLUMN IF NOT EXISTS mfg_offset_days integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS last_received_at timestamptz;