-- ==============================================================
-- 001_schema.sql
-- Complete schema for KL Demo CRM
-- Run this FIRST on a fresh Supabase project.
-- Includes: All tables + RLS policies (final, audited version)
-- ==============================================================


-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'agent')),
  phone       TEXT,
  avatar_url  TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  budget          BIGINT,
  area            TEXT,
  -- category: residential / commercial (what the buyer wants)
  category        TEXT CHECK (category IS NULL OR category IN ('residential', 'commercial')),
  -- property_type: what kind of property (home, plot, apartment)
  property_type   TEXT CHECK (property_type IS NULL OR property_type IN ('home', 'plot', 'apartment')),
  source          TEXT CHECK (source IN ('facebook','instagram','zameen','referral','whatsapp','walk-in','other')),
  stage           TEXT NOT NULL DEFAULT 'new_lead'
                  CHECK (stage IN ('new_lead','contacted','qualified','site_visit','negotiation','closed','lost')),
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignment_type TEXT DEFAULT 'auto' CHECK (assignment_type IN ('auto','manual')),
  notes           TEXT,
  raw_payload     JSONB,
  external_id     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Prevents duplicate leads on webhook retries (idempotency key)
CREATE UNIQUE INDEX leads_external_id_source_idx ON leads (external_id, source)
  WHERE external_id IS NOT NULL;

CREATE TABLE follow_ups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes        TEXT,
  is_done      BOOLEAN DEFAULT FALSE,
  notified     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE properties (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  price         BIGINT NOT NULL,
  location      TEXT NOT NULL,
  area_sqft     NUMERIC,
  category      TEXT CHECK (category IS NULL OR category IN ('residential', 'commercial')),
  property_type TEXT CHECK (property_type IS NULL OR property_type IN ('home', 'plot', 'apartment')),
  status        TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved')),
  description   TEXT,
  images        TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- ROW LEVEL SECURITY (Final audited version — 007_fix applied)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "authenticated users can read profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "owners and managers can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

CREATE POLICY "owners and managers can update profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- leads
CREATE POLICY "read access for leads" ON leads
  FOR SELECT USING (
    assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Prevents agents from spoofing assigned_to field
CREATE POLICY "insert access for leads" ON leads
  FOR INSERT WITH CHECK (
    assigned_to IS NULL
    OR assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

CREATE POLICY "update access for leads" ON leads
  FOR UPDATE USING (
    assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Delete: owner-ONLY per §8 RBAC matrix (Manager cannot delete leads)
CREATE POLICY "delete access for leads" ON leads
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- follow_ups
CREATE POLICY "read access for follow_ups" ON follow_ups
  FOR SELECT USING (
    agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Agents can only create follow-ups assigned to themselves
CREATE POLICY "insert access for follow_ups" ON follow_ups
  FOR INSERT WITH CHECK (
    agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

CREATE POLICY "update access for follow_ups" ON follow_ups
  FOR UPDATE USING (
    agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

CREATE POLICY "delete access for follow_ups" ON follow_ups
  FOR DELETE USING (
    agent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- properties
CREATE POLICY "authenticated users can read properties" ON properties
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "owners and managers can modify properties" ON properties
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- lead_activities
CREATE POLICY "read access for lead_activities" ON lead_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_activities.lead_id
      AND (
        leads.assigned_to = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
      )
    )
  );

-- Agents can only log activities on leads assigned to them
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
