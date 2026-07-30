-- 007_fix_rls_policies.sql
-- Fixes 4 RLS policy bugs found during Phase 2 audit:
--   1. leads DELETE: was owner+manager, §8 says owner-only
--   2. leads INSERT: was bare auth check, now prevents assignment spoofing
--   3. follow_ups INSERT: was bare auth check, now scoped to own agent_id
--   4. lead_activities INSERT: was bare auth check, now scoped to own leads
--
-- Pattern: DROP IF EXISTS + CREATE ensures idempotent re-runs.

-- ============================================================
-- 1. leads DELETE — owner-only (was incorrectly owner+manager)
-- ============================================================
DROP POLICY IF EXISTS "delete access for leads" ON leads;
CREATE POLICY "delete access for leads" ON leads
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- ============================================================
-- 2. leads INSERT — prevent agents from spoofing assigned_to
-- ============================================================
DROP POLICY IF EXISTS "insert access for leads" ON leads;
CREATE POLICY "insert access for leads" ON leads
  FOR INSERT WITH CHECK (
    assigned_to IS NULL
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- ============================================================
-- 3. follow_ups INSERT — agents can only create for themselves
-- ============================================================
DROP POLICY IF EXISTS "insert access for follow_ups" ON follow_ups;
CREATE POLICY "insert access for follow_ups" ON follow_ups
  FOR INSERT WITH CHECK (
    agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- ============================================================
-- 4. lead_activities INSERT — agents can only log on own leads
-- ============================================================
DROP POLICY IF EXISTS "insert access for lead_activities" ON lead_activities;
CREATE POLICY "insert access for lead_activities" ON lead_activities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_activities.lead_id
      AND (
        leads.assigned_to = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
      )
    )
  );
