-- Add category and image fields to polls table
ALTER TABLE public.polls 
ADD COLUMN category TEXT,
ADD COLUMN image_url TEXT;

-- Create categories enum for better consistency
CREATE TYPE poll_category AS ENUM (
  'politics', 
  'sports', 
  'economics', 
  'entertainment', 
  'technology', 
  'science', 
  'crypto', 
  'other'
);

-- Update the polls table to use the enum
ALTER TABLE public.polls 
ALTER COLUMN category TYPE poll_category USING category::poll_category;

-- Create storage bucket for poll images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'poll-images', 
  'poll-images', 
  true, 
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Create storage policies for poll images
CREATE POLICY "Anyone can view poll images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'poll-images');

CREATE POLICY "Admins can upload poll images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'poll-images' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update poll images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'poll-images' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete poll images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'poll-images' AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create comments table
CREATE TABLE public.poll_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on comments
ALTER TABLE public.poll_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for comments
CREATE POLICY "Anyone can view comments" 
ON public.poll_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create comments" 
ON public.poll_comments 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.poll_comments 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.poll_comments 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Add trigger for updating timestamps
CREATE TRIGGER update_poll_comments_updated_at
  BEFORE UPDATE ON public.poll_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();