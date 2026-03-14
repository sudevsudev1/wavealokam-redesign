
-- Surf schools (configurable by admins)
CREATE TABLE public.ops_surf_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_surf_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read surf schools"
  ON public.ops_surf_schools FOR SELECT TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can manage surf schools"
  ON public.ops_surf_schools FOR ALL TO authenticated
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

-- Guest stay options (configurable by admins)
CREATE TABLE public.ops_surf_guest_stays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  name text NOT NULL,
  default_commission numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_surf_guest_stays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read guest stays"
  ON public.ops_surf_guest_stays FOR SELECT TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can manage guest stays"
  ON public.ops_surf_guest_stays FOR ALL TO authenticated
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));

-- Board rentals
CREATE TABLE public.ops_surf_board_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  school_id uuid NOT NULL REFERENCES public.ops_surf_schools(id),
  rental_date date NOT NULL DEFAULT CURRENT_DATE,
  num_boards integer NOT NULL DEFAULT 1,
  rate_per_board numeric NOT NULL DEFAULT 500,
  amount_due numeric GENERATED ALWAYS AS (num_boards * rate_per_board) STORED,
  boards_returned integer NOT NULL DEFAULT 0,
  all_boards_good_condition boolean NOT NULL DEFAULT true,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_surf_board_rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users full access board rentals"
  ON public.ops_surf_board_rentals FOR ALL TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

-- Board rental payments
CREATE TABLE public.ops_surf_board_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  school_id uuid NOT NULL REFERENCES public.ops_surf_schools(id),
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_surf_board_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users full access board payments"
  ON public.ops_surf_board_payments FOR ALL TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

-- Surf lessons
CREATE TABLE public.ops_surf_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  lesson_date date NOT NULL DEFAULT CURRENT_DATE,
  num_lessons integer NOT NULL DEFAULT 1,
  guest_name text NOT NULL,
  guest_stay_id uuid NOT NULL REFERENCES public.ops_surf_guest_stays(id),
  fee_per_lesson numeric NOT NULL DEFAULT 0,
  total_fees numeric GENERATED ALWAYS AS (num_lessons * fee_per_lesson) STORED,
  commission_per_lesson numeric NOT NULL DEFAULT 0,
  total_commission numeric GENERATED ALWAYS AS (num_lessons * commission_per_lesson) STORED,
  auto_fare numeric NOT NULL DEFAULT 0,
  is_paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_surf_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users full access surf lessons"
  ON public.ops_surf_lessons FOR ALL TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

-- Surf lesson commission payments
CREATE TABLE public.ops_surf_lesson_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  guest_stay_id uuid NOT NULL REFERENCES public.ops_surf_guest_stays(id),
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_surf_lesson_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users full access lesson payments"
  ON public.ops_surf_lesson_payments FOR ALL TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

-- Surfing config (misc expenses, instructor salaries)
CREATE TABLE public.ops_surf_config (
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  key text NOT NULL,
  value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (branch_id, key)
);

ALTER TABLE public.ops_surf_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Same-branch users can read surf config"
  ON public.ops_surf_config FOR SELECT TO authenticated
  USING (branch_id = ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can manage surf config"
  ON public.ops_surf_config FOR ALL TO authenticated
  USING (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()))
  WITH CHECK (ops_has_role(auth.uid(), 'admin') AND branch_id = ops_user_branch_id(auth.uid()));
