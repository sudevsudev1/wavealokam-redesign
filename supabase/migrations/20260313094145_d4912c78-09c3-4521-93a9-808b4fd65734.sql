
ALTER TABLE public.ops_tasks ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Update RLS: hidden tasks only visible to assigned users and admins
DROP POLICY IF EXISTS "Same-branch users can read tasks" ON public.ops_tasks;
CREATE POLICY "Same-branch users can read tasks"
ON public.ops_tasks FOR SELECT TO public
USING (
  branch_id = ops_user_branch_id(auth.uid())
  AND (
    is_hidden = false
    OR ops_has_role(auth.uid(), 'admin')
    OR auth.uid() = ANY(assigned_to)
  )
);
