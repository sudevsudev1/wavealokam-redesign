
-- Phase 0: Add expected_check_in to guest log
ALTER TABLE public.ops_guest_log 
ADD COLUMN IF NOT EXISTS expected_check_in timestamp with time zone;

-- Phase D: Create laundry batches table
CREATE TABLE public.ops_laundry_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  sets_count integer NOT NULL DEFAULT 1,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_before_noon boolean NOT NULL DEFAULT true,
  expected_return_at timestamp with time zone NOT NULL,
  actual_return_at timestamp with time zone,
  status text NOT NULL DEFAULT 'in_transit',
  sent_by uuid NOT NULL,
  received_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for laundry batches
ALTER TABLE public.ops_laundry_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users full access laundry"
  ON public.ops_laundry_batches
  FOR ALL
  TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));
