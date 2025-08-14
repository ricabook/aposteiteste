-- Add foreign key constraint between poll_comments and profiles
-- This will allow proper JOIN queries between the tables

-- First, let's add the foreign key constraint to poll_comments
ALTER TABLE public.poll_comments 
ADD CONSTRAINT fk_poll_comments_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;