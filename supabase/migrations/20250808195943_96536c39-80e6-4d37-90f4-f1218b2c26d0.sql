-- Fix storage policies for poll-images bucket to allow authenticated users to upload images

-- First, let's create policies that allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload poll images" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'poll-images');

-- Allow authenticated users to update their own uploaded images
CREATE POLICY "Authenticated users can update poll images" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'poll-images');

-- Allow authenticated users to delete their own uploaded images  
CREATE POLICY "Authenticated users can delete poll images" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'poll-images');