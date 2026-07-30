-- 012_fix_cron_rpc.sql
-- FIX MIGRATION: Drop the old timezone-based RPC and create the new time-based one.

-- 1. Drop the old function that took arguments (TIMESTAMPTZ, TIMESTAMPTZ)
-- If we don't drop it, Postgres creates an overload instead of replacing it.
DROP FUNCTION IF EXISTS process_due_follow_ups(TIMESTAMPTZ, TIMESTAMPTZ);

-- 2. Create the new simplified function without arguments
CREATE OR REPLACE FUNCTION process_due_follow_ups()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  processed_count INT;
BEGIN
  WITH due_follow_ups AS (
    SELECT f.id, f.agent_id, f.lead_id, f.scheduled_at, l.name as lead_name
    FROM follow_ups f
    LEFT JOIN leads l ON l.id = f.lead_id
    WHERE f.is_done = false
      AND f.notified = false
      AND f.scheduled_at <= NOW()
  ),
  inserted_notifs AS (
    INSERT INTO notifications (agent_id, type, follow_up_id, lead_id, message, due_at, status)
    SELECT 
      agent_id, 
      'follow_up_due', 
      id, 
      lead_id, 
      'Follow up with ' || COALESCE(lead_name, 'lead') || ' is due', 
      scheduled_at, 
      'due'
    FROM due_follow_ups
    RETURNING follow_up_id
  )
  UPDATE follow_ups
  SET notified = true
  WHERE id IN (SELECT follow_up_id FROM inserted_notifs);

  GET DIAGNOSTICS processed_count = ROW_COUNT;
  
  RETURN processed_count;
END;
$$;

-- 3. Set the correct security policies for the new function
REVOKE EXECUTE ON FUNCTION process_due_follow_ups() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION process_due_follow_ups() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION process_due_follow_ups() TO service_role;
