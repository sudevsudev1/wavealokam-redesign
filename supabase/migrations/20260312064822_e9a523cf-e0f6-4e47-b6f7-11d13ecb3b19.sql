
CREATE TABLE public.ops_vector_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  topic text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Index for fast lookups
CREATE INDEX idx_ops_vector_knowledge_branch ON public.ops_vector_knowledge(branch_id, is_active);
CREATE INDEX idx_ops_vector_knowledge_topic ON public.ops_vector_knowledge USING gin(to_tsvector('english', topic));

-- RLS
ALTER TABLE public.ops_vector_knowledge ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage vector knowledge"
  ON public.ops_vector_knowledge
  FOR ALL
  TO authenticated
  USING (ops_has_role(auth.uid(), 'admin'::ops_role) AND branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (ops_has_role(auth.uid(), 'admin'::ops_role) AND branch_id = ops_user_branch_id(auth.uid()));

-- Same-branch users can read
CREATE POLICY "Same-branch users can read vector knowledge"
  ON public.ops_vector_knowledge
  FOR SELECT
  TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access vector knowledge"
  ON public.ops_vector_knowledge
  FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
