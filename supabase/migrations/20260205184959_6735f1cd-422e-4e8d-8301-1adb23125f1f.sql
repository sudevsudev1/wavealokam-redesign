-- Update status check constraint to include 'success'
ALTER TABLE public.automation_runs DROP CONSTRAINT automation_runs_status_check;
ALTER TABLE public.automation_runs ADD CONSTRAINT automation_runs_status_check 
  CHECK (status = ANY (ARRAY['started'::text, 'completed'::text, 'failed'::text, 'success'::text]));