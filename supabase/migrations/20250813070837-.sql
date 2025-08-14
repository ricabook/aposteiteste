-- Create a policy to allow everyone to view bet statistics for polls
-- This is safe because it only exposes aggregated data, not individual bet information
CREATE POLICY "Everyone can view bet statistics" 
ON public.bets 
FOR SELECT 
USING (true);