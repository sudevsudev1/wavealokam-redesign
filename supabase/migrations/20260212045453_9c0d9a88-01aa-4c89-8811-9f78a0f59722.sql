
-- Table for persistent behavioral directives from the owner
CREATE TABLE public.chat_directives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  directive TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'owner_chat',
  created_by_visitor_token TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.chat_directives ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (edge function uses service role)
-- No public access needed since this is only used server-side
CREATE POLICY "Service role full access on chat_directives"
  ON public.chat_directives
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fetching active directives quickly
CREATE INDEX idx_chat_directives_active ON public.chat_directives (is_active) WHERE is_active = true;
