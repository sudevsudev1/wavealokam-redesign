-- 1. Fix ops_has_role to check is_active
CREATE OR REPLACE FUNCTION public.ops_has_role(_user_id uuid, _role ops_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ops_user_profiles
    WHERE user_id = _user_id AND role = _role AND is_active = true
  );
$$;

-- 2. Fix ops_user_branch_id to check is_active
CREATE OR REPLACE FUNCTION public.ops_user_branch_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT branch_id FROM public.ops_user_profiles
  WHERE user_id = _user_id AND is_active = true;
$$;

-- 3. Fix guest log anon read policy - replace with RPC function
DROP POLICY IF EXISTS "Public can read own submission" ON ops_guest_log;

CREATE OR REPLACE FUNCTION public.ops_guest_by_token(_token text)
RETURNS SETOF ops_guest_log
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM public.ops_guest_log
  WHERE share_token = _token AND submission_source = 'guest_self';
$$;

-- 4. Fix shift breaks policies - add owner check
DROP POLICY IF EXISTS "Branch staff can insert breaks" ON ops_shift_breaks;
DROP POLICY IF EXISTS "Branch staff can update breaks" ON ops_shift_breaks;

CREATE POLICY "Staff can insert own breaks" ON ops_shift_breaks
FOR INSERT TO authenticated
WITH CHECK (
  branch_id = public.ops_user_branch_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM ops_shift_punches
    WHERE ops_shift_punches.id = shift_id
    AND ops_shift_punches.user_id = auth.uid()
  )
);

CREATE POLICY "Staff can update own breaks" ON ops_shift_breaks
FOR UPDATE TO authenticated
USING (
  branch_id = public.ops_user_branch_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM ops_shift_punches
    WHERE ops_shift_punches.id = shift_id
    AND ops_shift_punches.user_id = auth.uid()
  )
);