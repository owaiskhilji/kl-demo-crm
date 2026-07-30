-- ============================================================
-- 010_agent_properties.sql
-- Allow agents to add, edit, and delete their OWN properties.
-- Owners and managers can edit/delete ALL properties.
-- Everyone can view all properties.
-- ============================================================

-- 1. Track who added each property
ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 2. Drop the old all-in-one policy that restricted everything to owner/manager
DROP POLICY IF EXISTS "owners and managers can modify properties" ON properties;

-- 3. SELECT — everyone authenticated can view all properties (sb ko nzr ae)
DROP POLICY IF EXISTS "authenticated users can read properties" ON properties;
CREATE POLICY "authenticated users can read properties" ON properties
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4. INSERT — owner, manager, AND agent can all add new properties
-- Added security: created_by must match the logged-in user's ID
CREATE POLICY "owner manager agent can add properties" ON properties
  FOR INSERT WITH CHECK (
    auth.uid() = created_by 
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'agent')
    )
  );

-- 5. UPDATE — owner/manager can edit ANY property; agent can edit ONLY the one they added
CREATE POLICY "owner manager any, agent own property update" ON properties
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- 6. DELETE — owner/manager can delete ANY property; agent can delete ONLY their own
CREATE POLICY "owner manager any, agent own property delete" ON properties
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- ============================================================
-- STORAGE POLICY UPDATE
-- Agents also need permission to upload property images!
-- ============================================================

DROP POLICY IF EXISTS "Owners and Managers can upload property images" ON storage.objects;
CREATE POLICY "Owner manager agent can upload property images" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK ( 
    bucket_id = 'property-images' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager', 'agent')
    )
  );
