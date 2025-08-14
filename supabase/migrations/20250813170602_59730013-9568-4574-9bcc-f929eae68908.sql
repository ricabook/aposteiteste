-- Remove the existing constraint that limits options to A-F
ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS bets_option_chosen_check;

-- Add new constraint that allows options A through H
ALTER TABLE public.bets ADD CONSTRAINT bets_option_chosen_check 
CHECK (option_chosen = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'E'::text, 'F'::text, 'G'::text, 'H'::text]));