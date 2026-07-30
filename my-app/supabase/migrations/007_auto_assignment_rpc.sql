-- 010_auto_assignment_rpc.sql
-- Function to find the least-loaded agent for automatic lead assignment.
-- Evaluates current open leads (not closed/lost) per agent.

CREATE OR REPLACE FUNCTION get_least_loaded_agent()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.id
  FROM profiles p
  LEFT JOIN leads l ON l.assigned_to = p.id AND l.stage NOT IN ('closed', 'lost')
  WHERE p.role = 'agent'
  GROUP BY p.id
  ORDER BY COUNT(l.id) ASC
  LIMIT 1;
$$;

-- Secure the function: only authenticated users (manual lead creation) 
-- and service_role (webhooks) can execute this. No anonymous or public access.
REVOKE EXECUTE ON FUNCTION get_least_loaded_agent() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_least_loaded_agent() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_least_loaded_agent() TO service_role;
