
-- Shift punch records
CREATE TABLE public.ops_shift_punches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.ops_branches(id),
  clock_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_in_lat NUMERIC,
  clock_in_lng NUMERIC,
  clock_out_at TIMESTAMP WITH TIME ZONE,
  clock_out_lat NUMERIC,
  clock_out_lng NUMERIC,
  status TEXT NOT NULL DEFAULT 'clocked_in',
  total_break_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  flag_type TEXT,
  flag_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Break records within a shift
CREATE TABLE public.ops_shift_breaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.ops_shift_punches(id) ON DELETE CASCADE,
  break_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  break_end TIMESTAMP WITH TIME ZONE,
  break_type TEXT NOT NULL DEFAULT 'general',
  branch_id UUID NOT NULL REFERENCES public.ops_branches(id)
);

-- Enable RLS
ALTER TABLE public.ops_shift_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_shift_breaks ENABLE ROW LEVEL SECURITY;

-- Shift punches policies
CREATE POLICY "Users can read own shifts"
  ON public.ops_shift_punches FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all branch shifts"
  ON public.ops_shift_punches FOR SELECT
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Users can clock in"
  ON public.ops_shift_punches FOR INSERT
  WITH CHECK (user_id = auth.uid() AND branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Users can update own shifts"
  ON public.ops_shift_punches FOR UPDATE
  USING (user_id = auth.uid() AND branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can update branch shifts"
  ON public.ops_shift_punches FOR UPDATE
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

-- Break policies
CREATE POLICY "Users can read own breaks"
  ON public.ops_shift_breaks FOR SELECT
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Users can insert breaks"
  ON public.ops_shift_breaks FOR INSERT
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Users can update breaks"
  ON public.ops_shift_breaks FOR UPDATE
  USING (branch_id = ops_user_branch_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_shift_punches_updated_at
  BEFORE UPDATE ON public.ops_shift_punches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_shift_punches;
