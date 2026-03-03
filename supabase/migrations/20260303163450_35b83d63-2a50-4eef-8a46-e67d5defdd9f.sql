
-- Guest log for check-in / check-out tracking
CREATE TABLE public.ops_guest_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  guest_name text NOT NULL,
  phone text,
  email text,
  adults integer NOT NULL DEFAULT 1,
  children integer NOT NULL DEFAULT 0,
  room_id text REFERENCES public.ops_rooms(id),
  id_proof_type text, -- Aadhaar, Passport, DL, etc.
  id_proof_url text,
  purpose text DEFAULT 'Leisure',
  source text DEFAULT 'Walk-in', -- Walk-in, OTA, Direct, Referral
  check_in_at timestamptz NOT NULL DEFAULT now(),
  expected_check_out timestamptz,
  check_out_at timestamptz,
  check_out_by uuid,
  notes text,
  checked_in_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'checked_in', -- checked_in, checked_out, no_show, cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_guest_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read guest log" ON public.ops_guest_log
  FOR SELECT USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can insert guest log" ON public.ops_guest_log
  FOR INSERT WITH CHECK (branch_id = ops_user_branch_id(auth.uid()) AND checked_in_by = auth.uid());

CREATE POLICY "Same-branch users can update guest log" ON public.ops_guest_log
  FOR UPDATE USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can delete guest log" ON public.ops_guest_log
  FOR DELETE USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_guest_log;
