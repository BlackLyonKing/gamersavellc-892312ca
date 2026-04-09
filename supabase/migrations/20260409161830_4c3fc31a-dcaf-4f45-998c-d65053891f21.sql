
CREATE TABLE public.portfolio_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tech_stack TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT '',
  screenshot TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portfolio projects"
  ON public.portfolio_projects FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert portfolio projects"
  ON public.portfolio_projects FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update portfolio projects"
  ON public.portfolio_projects FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete portfolio projects"
  ON public.portfolio_projects FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
