
-- Create linen items table for individual linen lifecycle tracking
CREATE TABLE public.ops_linen_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.ops_branches(id),
  item_type TEXT NOT NULL DEFAULT 'bedsheet',
  item_label TEXT,
  room_id TEXT,
  guest_id UUID,
  status TEXT NOT NULL DEFAULT 'fresh',
  expected_free_at TIMESTAMP WITH TIME ZONE,
  status_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status_changed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ops_linen_items ENABLE ROW LEVEL SECURITY;

-- Same-branch users full access
CREATE POLICY "Same-branch users full access linen items"
  ON public.ops_linen_items FOR ALL
  TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_linen_items;

-- Update RLS on ops_room_refill_templates to allow all authenticated same-branch users
DROP POLICY IF EXISTS "Admins can manage refill templates" ON public.ops_room_refill_templates;
DROP POLICY IF EXISTS "Same-branch users can read refill templates" ON public.ops_room_refill_templates;

CREATE POLICY "Same-branch users full access refill templates"
  ON public.ops_room_refill_templates FOR ALL
  TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));
