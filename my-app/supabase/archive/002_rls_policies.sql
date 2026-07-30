ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- profiles: Anyone authenticated can read all profiles. Insert/Update is for owners/managers.
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

-- leads: agents see their own leads or unassigned, owners/managers see all
CREATE POLICY "read access for leads" ON leads
  FOR SELECT USING (
    assigned_to = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'manager'))
  );

-- Insert: any authenticated user can create a lead, but agents can only
-- assign to themselves or leave unassigned (prevents spoofing assignments).
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

-- Delete: owner-only per §8 RBAC matrix (Manager cannot delete leads).
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

-- Insert: agents can only create follow-ups assigned to themselves;
-- owners/managers can create for any agent.
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

-- Insert: agents can log activities on their own leads; owners/managers on any lead.
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
