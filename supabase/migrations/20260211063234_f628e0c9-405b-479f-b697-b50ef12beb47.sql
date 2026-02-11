
-- Visitor memory for Drifter chatbot
CREATE TABLE public.chat_visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_token TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  email TEXT,
  summary TEXT,
  last_booking_context JSONB,
  conversation_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS needed - this is accessed via edge function with service role key
-- Public visitors don't have auth, edge function handles access control
ALTER TABLE public.chat_visitors ENABLE ROW LEVEL SECURITY;

-- Index for fast token lookups
CREATE INDEX idx_chat_visitors_token ON public.chat_visitors (visitor_token);

-- Auto-update timestamp
CREATE TRIGGER update_chat_visitors_updated_at
  BEFORE UPDATE ON public.chat_visitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
