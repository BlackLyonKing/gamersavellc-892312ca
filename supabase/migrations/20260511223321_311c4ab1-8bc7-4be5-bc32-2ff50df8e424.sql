
-- 1) Lock down SECURITY DEFINER function execution to least privilege.
-- has_role: needed by RLS policies for authenticated users only.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- get_admin_emails: only called server-side via service role; revoke from clients.
REVOKE ALL ON FUNCTION public.get_admin_emails() FROM PUBLIC, anon, authenticated;

-- Trigger functions: never need direct EXECUTE from clients.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 2) Remove invoices from Realtime publication (not subscribed to by client and reduces leak surface).
ALTER PUBLICATION supabase_realtime DROP TABLE public.invoices;

-- 3) Defense-in-depth: explicitly prevent any user from self-assigning roles
-- via a trigger that blocks non-admin INSERT/UPDATE/DELETE on user_roles even if
-- a future permissive policy is added by mistake.
CREATE OR REPLACE FUNCTION public.prevent_role_self_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow when no auth context (server-side seeding via service role bypasses triggers? No — triggers always fire.
  -- Service role calls have auth.uid() = null, so allow null uid (server-side).
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can modify user roles';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_role_self_assignment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_user_roles_changes ON public.user_roles;
CREATE TRIGGER guard_user_roles_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_assignment();
