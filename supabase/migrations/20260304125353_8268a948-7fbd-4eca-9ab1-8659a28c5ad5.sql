
-- Reminders table for Vector-managed reminders
CREATE TABLE public.ops_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  reminder_type text NOT NULL DEFAULT 'one_time' CHECK (reminder_type IN ('one_time', 'recurring')),
  recurrence_rule jsonb DEFAULT '{}'::jsonb,
  next_fire_at timestamptz NOT NULL,
  last_fired_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'snoozed', 'cancelled')),
  follow_up_status text CHECK (follow_up_status IN ('pending', 'done', 'not_done', 'rescheduled')),
  follow_up_response text,
  fire_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_reminders ENABLE ROW LEVEL SECURITY;

-- Users can read their own reminders
CREATE POLICY "Users can read own reminders" ON public.ops_reminders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR ops_has_role(auth.uid(), 'admin'::ops_role));

-- Users can update own reminders (for follow-up responses)
CREATE POLICY "Users can update own reminders" ON public.ops_reminders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR ops_has_role(auth.uid(), 'admin'::ops_role));

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access reminders" ON public.ops_reminders
  FOR ALL TO authenticated
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Same-branch authenticated users can insert (Vector creates reminders)
CREATE POLICY "Same-branch users can create reminders" ON public.ops_reminders
  FOR INSERT TO authenticated
  WITH CHECK (branch_id = ops_user_branch_id(auth.uid()));

-- Notifications table for in-app notifications
CREATE TABLE public.ops_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES public.ops_branches(id),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'reminder' CHECK (type IN ('reminder', 'follow_up', 'warning', 'info')),
  related_reminder_id uuid REFERENCES public.ops_reminders(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ops_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON public.ops_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.ops_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access notifications" ON public.ops_notifications
  FOR ALL TO authenticated
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_notifications;
