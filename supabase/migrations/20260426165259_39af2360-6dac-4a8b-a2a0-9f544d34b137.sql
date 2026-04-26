-- Onboarding submissions from new clients
CREATE TABLE public.client_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  -- Step 1: Company
  company_name text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  team_size text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  -- Step 2: Goals
  primary_goal text NOT NULL DEFAULT '',
  pain_points text NOT NULL DEFAULT '',
  existing_tools text NOT NULL DEFAULT '',
  -- Step 3: Project
  package_interest text NOT NULL DEFAULT '',
  budget_range text NOT NULL DEFAULT '',
  timeline text NOT NULL DEFAULT '',
  project_summary text NOT NULL DEFAULT '',
  -- Step 4: Schedule
  preferred_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  timezone text NOT NULL DEFAULT '',
  confirmed_call_at timestamptz,
  -- Meta
  status text NOT NULL DEFAULT 'in_progress', -- in_progress | submitted | call_scheduled | completed
  current_step integer NOT NULL DEFAULT 1,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

-- Clients manage their own onboarding
CREATE POLICY "Clients view own onboarding"
  ON public.client_onboarding FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Clients insert own onboarding"
  ON public.client_onboarding FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients update own onboarding"
  ON public.client_onboarding FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id);

-- Admins full access
CREATE POLICY "Admins view all onboarding"
  ON public.client_onboarding FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update all onboarding"
  ON public.client_onboarding FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete onboarding"
  ON public.client_onboarding FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Reuse existing updated_at helper if present, else create one
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_client_onboarding_updated_at
  BEFORE UPDATE ON public.client_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_client_onboarding_status ON public.client_onboarding(status);
CREATE INDEX idx_client_onboarding_client_id ON public.client_onboarding(client_id);