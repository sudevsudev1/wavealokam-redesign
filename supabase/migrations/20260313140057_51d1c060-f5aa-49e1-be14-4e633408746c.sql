
-- Recurring meta tasks (grouping container, e.g. "AC Filter Cleaning")
CREATE TABLE public.ops_recurring_meta_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Operations',
  priority text NOT NULL DEFAULT 'Medium',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Individual recurring tasks (can be standalone or belong to a meta task)
CREATE TABLE public.ops_recurring_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_task_id uuid REFERENCES public.ops_recurring_meta_tasks(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Operations',
  priority text NOT NULL DEFAULT 'Medium',
  frequency_days integer NOT NULL DEFAULT 7,
  assigned_to uuid[] NOT NULL DEFAULT '{}',
  related_room_id text,
  is_active boolean NOT NULL DEFAULT true,
  last_executed_at timestamptz,
  next_execution_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ops_recurring_meta_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_recurring_tasks ENABLE ROW LEVEL SECURITY;

-- Meta tasks: same-branch read, same-branch insert/update, admin-only delete
CREATE POLICY "Same-branch users can read recurring meta tasks"
  ON public.ops_recurring_meta_tasks FOR SELECT TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can insert recurring meta tasks"
  ON public.ops_recurring_meta_tasks FOR INSERT TO authenticated
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can update recurring meta tasks"
  ON public.ops_recurring_meta_tasks FOR UPDATE TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can delete recurring meta tasks"
  ON public.ops_recurring_meta_tasks FOR DELETE TO authenticated
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

-- Recurring tasks: same-branch read, same-branch insert/update, admin-only delete
CREATE POLICY "Same-branch users can read recurring tasks"
  ON public.ops_recurring_tasks FOR SELECT TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can insert recurring tasks"
  ON public.ops_recurring_tasks FOR INSERT TO authenticated
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can update recurring tasks"
  ON public.ops_recurring_tasks FOR UPDATE TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can delete recurring tasks"
  ON public.ops_recurring_tasks FOR DELETE TO authenticated
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_recurring_meta_tasks_updated_at
  BEFORE UPDATE ON public.ops_recurring_meta_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_tasks_updated_at
  BEFORE UPDATE ON public.ops_recurring_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
