
CREATE POLICY "Admins can delete contracts"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
