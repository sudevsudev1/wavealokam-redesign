-- Fix remaining shift breaks policies for read/update
DROP POLICY IF EXISTS "Users can read own breaks" ON ops_shift_breaks;
DROP POLICY IF EXISTS "Users can update breaks" ON ops_shift_breaks;

CREATE POLICY "Users can read own breaks" ON ops_shift_breaks
FOR SELECT TO authenticated
USING (
  branch_id = public.ops_user_branch_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM ops_shift_punches
    WHERE ops_shift_punches.id = shift_id
    AND ops_shift_punches.user_id = auth.uid()
  )
);

-- Admin can read all breaks in their branch
CREATE POLICY "Admin can read all branch breaks" ON ops_shift_breaks
FOR SELECT TO authenticated
USING (
  branch_id = public.ops_user_branch_id(auth.uid())
  AND public.ops_has_role(auth.uid(), 'admin')
);

-- Fix guest log insert policy - validate share_token format (UUID)
DROP POLICY IF EXISTS "Public can insert guest self-checkin" ON ops_guest_log;

CREATE POLICY "Public can insert guest self-checkin" ON ops_guest_log
FOR INSERT TO anon
WITH CHECK (
  submission_source = 'guest_self'
  AND share_token IS NOT NULL
  AND length(share_token) = 36
  AND share_token ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND approval_status = 'pending'
  AND status = 'pending_approval'
);