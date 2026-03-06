
CREATE TABLE public.ops_purchase_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_purchase_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read templates"
  ON public.ops_purchase_templates FOR SELECT
  TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Same-branch users can create templates"
  ON public.ops_purchase_templates FOR INSERT
  TO authenticated
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Template owners and admins can update"
  ON public.ops_purchase_templates FOR UPDATE
  TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()) AND (created_by = auth.uid() OR ops_has_role(auth.uid(), 'admin')));

CREATE POLICY "Template owners and admins can delete"
  ON public.ops_purchase_templates FOR DELETE
  TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()) AND (created_by = auth.uid() OR ops_has_role(auth.uid(), 'admin')));

CREATE TRIGGER update_ops_purchase_templates_updated_at
  BEFORE UPDATE ON public.ops_purchase_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
