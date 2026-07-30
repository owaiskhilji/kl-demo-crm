-- 007_storage_bucket.sql
-- Create Supabase Storage bucket for property images and configure RLS policies

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. (Skipped) RLS is already enabled by default on storage.objects in Supabase.

-- 3. Policy: Public can read all files in 'property-images' bucket
CREATE POLICY "Public Access for property images" 
  ON storage.objects FOR SELECT 
  USING ( bucket_id = 'property-images' );

-- 4. Policy: Only Owners and Managers can upload files to 'property-images' bucket
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

-- 5. Policy: Authenticated users can update/delete their own uploads (optional, but good for cleanup)
CREATE POLICY "Users can update their own uploads" 
  ON storage.objects FOR UPDATE 
  TO authenticated 
  USING ( bucket_id = 'property-images' AND owner = auth.uid() );

CREATE POLICY "Users can delete their own uploads" 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING ( bucket_id = 'property-images' AND owner = auth.uid() );


