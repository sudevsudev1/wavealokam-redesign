
-- Daily reports table for manager submissions
CREATE TABLE public.ops_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES ops_branches(id),
  report_date date NOT NULL,
  submitted_by uuid NOT NULL,
  revenue_total numeric DEFAULT 0,
  revenue_cash numeric DEFAULT 0,
  revenue_online numeric DEFAULT 0,
  occupancy_notes text,
  kitchen_notes text,
  maintenance_notes text,
  general_notes text,
  highlights text,
  issues text,
  status text NOT NULL DEFAULT 'submitted',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(branch_id, report_date, submitted_by)
);

ALTER TABLE public.ops_daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS: managers can insert/read own reports, admins can read/update all branch reports
CREATE POLICY "Managers can submit daily reports"
  ON public.ops_daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()) AND submitted_by = auth.uid());

CREATE POLICY "Same-branch users can read daily reports"
  ON public.ops_daily_reports FOR SELECT
  TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can update daily reports"
  ON public.ops_daily_reports FOR UPDATE
  TO authenticated
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Submitters can update own draft reports"
  ON public.ops_daily_reports FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid() AND status = 'submitted' AND branch_id = ops_user_branch_id(auth.uid()));
