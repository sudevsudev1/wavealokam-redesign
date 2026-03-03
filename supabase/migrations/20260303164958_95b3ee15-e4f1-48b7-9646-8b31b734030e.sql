
-- Add columns for guest self-check-in and approval workflow
ALTER TABLE public.ops_guest_log
  ADD COLUMN IF NOT EXISTS submission_source text NOT NULL DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_by uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE DEFAULT NULL;

-- Allow public inserts for guest self-check-in (with share_token)
CREATE POLICY "Public can insert guest self-checkin"
  ON public.ops_guest_log
  FOR INSERT
  TO anon
  WITH CHECK (submission_source = 'guest_self' AND share_token IS NOT NULL);

-- Allow public to read their own submission by share_token
CREATE POLICY "Public can read own submission"
  ON public.ops_guest_log
  FOR SELECT
  TO anon
  USING (share_token IS NOT NULL AND submission_source = 'guest_self');
