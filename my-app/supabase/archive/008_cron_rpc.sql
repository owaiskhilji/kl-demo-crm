-- 008_cron_rpc.sql
-- Creates an atomic RPC function to process due follow-ups.
-- This ensures that inserting notifications and updating follow_ups.notified
-- happens in a single transaction, avoiding duplicate notifications on partial failures.

-- Drop the previous version of the function that took timezone boundaries as parameters.
-- Postgres requires explicit drops when parameter signatures change to avoid creating overloads.
DROP FUNCTION IF EXISTS process_due_follow_ups(TIMESTAMPTZ, TIMESTAMPTZ);

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

-- Critical Security Gap Fix:
REVOKE EXECUTE ON FUNCTION process_due_follow_ups() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION process_due_follow_ups() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION process_due_follow_ups() TO service_role;
