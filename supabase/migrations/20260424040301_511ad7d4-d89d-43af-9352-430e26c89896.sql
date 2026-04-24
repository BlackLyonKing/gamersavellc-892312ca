-- 1. Remove client SELECT access to payment_splits (internal financial data)
DROP POLICY IF EXISTS "Clients can view splits for own contracts" ON public.payment_splits;

-- 2. Restrict Realtime channel subscriptions
-- Enable RLS on realtime.messages (it is on by default but ensure it)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior policy with this name to keep the migration idempotent
DROP POLICY IF EXISTS "Authenticated users can subscribe to authorized topics" ON realtime.messages;

-- Allow subscriptions only when:
--   * the user is an admin, OR
--   * the topic equals a project id the user owns, OR
--   * the topic starts with "project:<projectId>" for a project they own, OR
--   * the topic equals or starts with the user's own auth uid (for user-scoped channels)
CREATE POLICY "Authenticated users can subscribe to authorized topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.client_id = auth.uid()
      AND (
        realtime.topic() = p.id::text
        OR realtime.topic() LIKE 'project:' || p.id::text || '%'
        OR realtime.topic() LIKE 'project-' || p.id::text || '%'
      )
  )
  OR realtime.topic() = auth.uid()::text
  OR realtime.topic() LIKE 'user:' || auth.uid()::text || '%'
  OR realtime.topic() LIKE 'user-' || auth.uid()::text || '%'
);