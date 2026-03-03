
-- Task Library (admin templates for recurring tasks)
CREATE TABLE public.ops_task_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  description_en text,
  category text NOT NULL DEFAULT 'Operations',
  default_priority text NOT NULL DEFAULT 'Medium',
  default_due_rule_json jsonb DEFAULT '{}',
  default_assignees uuid[] DEFAULT '{}',
  proof_required_default boolean NOT NULL DEFAULT false,
  receipt_required_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  branch_id uuid NOT NULL REFERENCES ops_branches(id),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_task_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read task library"
  ON public.ops_task_library FOR SELECT
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can manage task library"
  ON public.ops_task_library FOR ALL
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

-- Tasks
CREATE TABLE public.ops_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_original text NOT NULL,
  title_en text,
  title_ml text,
  description_original text,
  description_en text,
  description_ml text,
  original_language text NOT NULL DEFAULT 'en',
  category text NOT NULL DEFAULT 'Operations',
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'To Do',
  due_datetime timestamptz,
  assigned_to uuid[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  branch_id uuid NOT NULL REFERENCES ops_branches(id),
  template_id uuid REFERENCES ops_task_library(id),
  blocked_reason_code text,
  blocked_reason_text_original text,
  blocked_reason_text_en text,
  blocked_reason_text_ml text,
  completion_notes_original text,
  completion_notes_en text,
  completion_notes_ml text,
  proof_required boolean NOT NULL DEFAULT false,
  receipt_required boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}',
  related_room_id text REFERENCES ops_rooms(id),
  related_inventory_item_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_tasks ENABLE ROW LEVEL SECURITY;

-- All same-branch authenticated users can read tasks
CREATE POLICY "Same-branch users can read tasks"
  ON public.ops_tasks FOR SELECT
  USING (branch_id = ops_user_branch_id(auth.uid()));

-- Only admins can create tasks
CREATE POLICY "Admins can create tasks"
  ON public.ops_tasks FOR INSERT
  WITH CHECK (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

-- Admins can update any task; managers can update tasks assigned to them
CREATE POLICY "Users can update assigned tasks"
  ON public.ops_tasks FOR UPDATE
  USING (
    branch_id = ops_user_branch_id(auth.uid()) AND (
      ops_has_role(auth.uid(), 'admin') OR
      auth.uid() = ANY(assigned_to)
    )
  );

-- Only admins can delete (cancel) tasks
CREATE POLICY "Admins can delete tasks"
  ON public.ops_tasks FOR DELETE
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

-- Task Attachments
CREATE TABLE public.ops_task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES ops_tasks(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'Other',
  file_url text NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  vendor text,
  amount numeric,
  bill_date date,
  tags text[] DEFAULT '{}',
  branch_id uuid NOT NULL REFERENCES ops_branches(id)
);

ALTER TABLE public.ops_task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read attachments"
  ON public.ops_task_attachments FOR SELECT
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can add attachments"
  ON public.ops_task_attachments FOR INSERT
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "Admins can manage attachments"
  ON public.ops_task_attachments FOR ALL
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_ops_task_library_updated_at
  BEFORE UPDATE ON public.ops_task_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ops_tasks_updated_at
  BEFORE UPDATE ON public.ops_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_tasks;

-- Storage bucket for ops attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('ops-attachments', 'ops-attachments', false);

-- Storage policies for ops-attachments
CREATE POLICY "Authenticated users can upload ops attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ops-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read ops attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ops-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Admins can delete ops attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'ops-attachments' AND auth.role() = 'authenticated');
