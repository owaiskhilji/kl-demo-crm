-- ============================================================
-- 008_message_log_insert_policy.sql
-- Adds INSERT policy on message_log so agents can log outbound
-- messages for leads assigned to them (required for WhatsApp
-- chat feature — sendWhatsAppMessage Server Action).
--
-- RUN THIS IN SUPABASE SQL EDITOR if the policy doesn't exist yet.
-- Check first: SELECT policyname FROM pg_policies WHERE tablename = 'message_log';
-- ============================================================

-- Only create if not already present (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'message_log'
    AND policyname = 'insert access for message_log'
  ) THEN
    EXECUTE '
      CREATE POLICY "insert access for message_log" ON message_log
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM leads
            WHERE leads.id = message_log.lead_id
            AND (
              leads.assigned_to = auth.uid()
              OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (''owner'', ''manager''))
            )
          )
        )
    ';
    RAISE NOTICE 'Policy "insert access for message_log" created successfully.';
  ELSE
    RAISE NOTICE 'Policy "insert access for message_log" already exists — skipping.';
  END IF;
END
$$;
