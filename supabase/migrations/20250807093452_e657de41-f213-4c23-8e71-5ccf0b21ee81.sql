-- Add foreign key constraint between shares and polls
-- This will allow proper JOIN queries between the tables

-- First, add the foreign key constraint to shares
ALTER TABLE public.shares 
ADD CONSTRAINT fk_shares_poll_id 
FOREIGN KEY (poll_id) REFERENCES public.polls(id) 
ON DELETE CASCADE;