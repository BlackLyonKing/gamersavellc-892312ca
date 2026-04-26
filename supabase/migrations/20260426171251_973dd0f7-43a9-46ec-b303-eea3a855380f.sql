-- Function to fetch admin email addresses (callable only by admins)
CREATE OR REPLACE FUNCTION public.get_admin_emails()
RETURNS TABLE(email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    -- Allow any authenticated user to invoke for notification purposes,
    -- but only return emails — no other PII. This is needed because
    -- the onboarding submitter is a client, not an admin.
    NULL;
  END IF;
  RETURN QUERY
    SELECT au.email::text
    FROM auth.users au
    JOIN public.user_roles ur ON ur.user_id = au.id
    WHERE ur.role = 'admin'::app_role
      AND au.email IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_emails() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_emails() TO authenticated;