
-- ============================================================
-- Wavealokam Ops Phase 1 — Foundation Tables & RLS
-- ============================================================

-- 1) Role enum
CREATE TYPE public.ops_role AS ENUM ('manager', 'admin');

-- 2) Branches table
CREATE TABLE public.ops_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_branches ENABLE ROW LEVEL SECURITY;

-- 3) User profiles (linked to auth.users)
CREATE TABLE public.ops_user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.ops_role NOT NULL DEFAULT 'manager',
  display_name text NOT NULL,
  preferred_language text NOT NULL DEFAULT 'en',
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_user_profiles ENABLE ROW LEVEL SECURITY;

-- 4) Rooms
CREATE TABLE public.ops_rooms (
  id text PRIMARY KEY,
  room_type text NOT NULL,
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_rooms ENABLE ROW LEVEL SECURITY;

-- 5) Config registry
CREATE TABLE public.ops_config_registry (
  key text PRIMARY KEY,
  value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_config_registry ENABLE ROW LEVEL SECURITY;

-- 6) Audit log (append-only)
CREATE TABLE public.ops_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  before_json jsonb,
  after_json jsonb,
  performed_by uuid NOT NULL REFERENCES auth.users(id),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ops_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Security definer helper functions (avoid recursive RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION public.ops_has_role(_user_id uuid, _role public.ops_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ops_user_profiles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.ops_user_branch_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.ops_user_profiles
  WHERE user_id = _user_id;
$$;

-- ============================================================
-- RLS Policies
-- ============================================================

-- ops_branches: all authenticated can read, admins can mutate
CREATE POLICY "Authenticated users can read branches"
  ON public.ops_branches FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage branches"
  ON public.ops_branches FOR ALL TO authenticated
  USING (public.ops_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ops_has_role(auth.uid(), 'admin'));

-- ops_user_profiles: users read own branch profiles, admins manage
CREATE POLICY "Users can read own profile"
  ON public.ops_user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read same-branch profiles"
  ON public.ops_user_profiles FOR SELECT TO authenticated
  USING (branch_id = public.ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can manage profiles"
  ON public.ops_user_profiles FOR ALL TO authenticated
  USING (public.ops_has_role(auth.uid(), 'admin') AND branch_id = public.ops_user_branch_id(auth.uid()))
  WITH CHECK (public.ops_has_role(auth.uid(), 'admin') AND branch_id = public.ops_user_branch_id(auth.uid()));

-- ops_rooms: same-branch read, admin mutate
CREATE POLICY "Same-branch users can read rooms"
  ON public.ops_rooms FOR SELECT TO authenticated
  USING (branch_id = public.ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can manage rooms"
  ON public.ops_rooms FOR ALL TO authenticated
  USING (public.ops_has_role(auth.uid(), 'admin') AND branch_id = public.ops_user_branch_id(auth.uid()))
  WITH CHECK (public.ops_has_role(auth.uid(), 'admin') AND branch_id = public.ops_user_branch_id(auth.uid()));

-- ops_config_registry: same-branch read, admin mutate
CREATE POLICY "Same-branch users can read config"
  ON public.ops_config_registry FOR SELECT TO authenticated
  USING (branch_id = public.ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can manage config"
  ON public.ops_config_registry FOR ALL TO authenticated
  USING (public.ops_has_role(auth.uid(), 'admin') AND branch_id = public.ops_user_branch_id(auth.uid()))
  WITH CHECK (public.ops_has_role(auth.uid(), 'admin') AND branch_id = public.ops_user_branch_id(auth.uid()));

-- ops_audit_log: append-only (INSERT for authenticated, SELECT for admin same-branch)
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.ops_audit_log FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid() AND branch_id = public.ops_user_branch_id(auth.uid()));

CREATE POLICY "Admins can read audit logs"
  ON public.ops_audit_log FOR SELECT TO authenticated
  USING (public.ops_has_role(auth.uid(), 'admin') AND branch_id = public.ops_user_branch_id(auth.uid()));

-- No UPDATE or DELETE policies on audit_log (immutable)

-- ============================================================
-- Triggers for updated_at
-- ============================================================

CREATE TRIGGER update_ops_branches_updated_at
  BEFORE UPDATE ON public.ops_branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ops_user_profiles_updated_at
  BEFORE UPDATE ON public.ops_user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ops_rooms_updated_at
  BEFORE UPDATE ON public.ops_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
