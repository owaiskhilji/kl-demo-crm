-- Add notifications table to the supabase_realtime publication
-- This enables Supabase Realtime to broadcast changes for this table.
-- Because RLS is already enabled on notifications (in 005), Realtime will 
-- natively enforce those RLS policies on the websocket payload.

BEGIN;

-- Check if publication exists before trying to add (Supabase default)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- Try to add the table. (Catch exception if already added to prevent failure)
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    EXCEPTION
      WHEN duplicate_object THEN
        -- Table already in publication, safe to ignore
        NULL;
    END;
  END IF;
END
$$;

COMMIT;
