-- 015_fix_storage_policy.sql
-- FIX MIGRATION: Drop the overly permissive storage upload policy and replace it 
-- with the strict owner/manager role-based policy.

-- 1. Drop the old policy (from the original 007 migration)
DROP POLICY IF EXISTS "Authenticated users can upload property images" ON storage.objects;

-- 2. Create the new restricted policy (from the updated 014 migration)
CREATE POLICY "Owners and Managers can upload property images" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK ( 
    bucket_id = 'property-images' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );
