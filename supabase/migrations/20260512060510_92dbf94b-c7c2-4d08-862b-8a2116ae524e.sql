
CREATE TABLE public.vapi_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound','web')),
  status TEXT,
  from_number TEXT,
  to_number TEXT,
  assistant_id TEXT,
  duration_seconds INTEGER,
  cost NUMERIC(10,4),
  transcript TEXT,
  summary TEXT,
  recording_url TEXT,
  ended_reason TEXT,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vapi_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all call logs"
  ON public.vapi_call_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert call logs"
  ON public.vapi_call_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update call logs"
  ON public.vapi_call_logs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_vapi_call_logs_updated_at
  BEFORE UPDATE ON public.vapi_call_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_vapi_call_logs_created_at ON public.vapi_call_logs(created_at DESC);
CREATE INDEX idx_vapi_call_logs_direction ON public.vapi_call_logs(direction);
