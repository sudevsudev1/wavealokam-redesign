
CREATE TABLE public.emotion_gaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  emotion_name TEXT NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  sample_contexts TEXT[] DEFAULT '{}',
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(emotion_name)
);

-- Public table, no RLS needed (only accessed by edge functions with service role)
ALTER TABLE public.emotion_gaps ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role key)
CREATE POLICY "Service role full access" ON public.emotion_gaps
  FOR ALL USING (true) WITH CHECK (true);
