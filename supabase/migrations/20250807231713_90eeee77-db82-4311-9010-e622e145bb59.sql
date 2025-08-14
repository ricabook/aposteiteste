-- Remove the existing constraint that limits options to only A and B
ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS bets_option_chosen_check;

-- Add a new constraint that allows options A, B, C, D, E, F to support multi-option polls
ALTER TABLE public.bets ADD CONSTRAINT bets_option_chosen_check 
CHECK (option_chosen IN ('A', 'B', 'C', 'D', 'E', 'F'));