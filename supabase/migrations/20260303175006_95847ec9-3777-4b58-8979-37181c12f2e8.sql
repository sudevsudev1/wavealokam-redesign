
-- Add photo metadata columns to ops_task_attachments
ALTER TABLE public.ops_task_attachments
  ADD COLUMN photo_taken_at timestamp with time zone,
  ADD COLUMN photo_lat numeric,
  ADD COLUMN photo_lng numeric,
  ADD COLUMN photo_device text,
  ADD COLUMN upload_timestamp timestamp with time zone DEFAULT now(),
  ADD COLUMN metadata_json jsonb DEFAULT '{}'::jsonb;
