-- First, let's check and fix the polls constraint that doesn't allow 'cancelled' as winning_option
-- We need to update the constraint to allow 'cancelled' as a valid value
ALTER TABLE public.polls DROP CONSTRAINT IF EXISTS polls_winning_option_check;

-- Add a new constraint that allows 'cancelled' as a valid option
ALTER TABLE public.polls ADD CONSTRAINT polls_winning_option_check 
CHECK (winning_option IS NULL OR winning_option IN ('A', 'B', 'cancelled'));