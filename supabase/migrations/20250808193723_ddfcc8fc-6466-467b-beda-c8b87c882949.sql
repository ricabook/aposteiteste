-- Add poll_type column to polls table
ALTER TABLE public.polls 
ADD COLUMN poll_type text NOT NULL DEFAULT 'B';

-- Add constraint to ensure valid poll types
ALTER TABLE public.polls 
ADD CONSTRAINT polls_poll_type_check 
CHECK (poll_type IN ('A', 'B'));

-- Update existing polls to be type B (OPÇÕES) by default
UPDATE public.polls SET poll_type = 'B' WHERE poll_type IS NULL;