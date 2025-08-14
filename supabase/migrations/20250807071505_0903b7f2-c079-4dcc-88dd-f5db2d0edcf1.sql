-- Create table to track odds history
CREATE TABLE public.odds_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_a_odds DECIMAL(10,2) NOT NULL,
  option_b_odds DECIMAL(10,2) NOT NULL,
  option_a_percentage DECIMAL(5,2) NOT NULL,
  option_b_percentage DECIMAL(5,2) NOT NULL,
  total_volume DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.odds_history ENABLE ROW LEVEL SECURITY;

-- Create policies for odds history (read-only for all users)
CREATE POLICY "Odds history is viewable by everyone" 
ON public.odds_history 
FOR SELECT 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_odds_history_poll_id ON public.odds_history(poll_id);
CREATE INDEX idx_odds_history_created_at ON public.odds_history(created_at);

-- Create function to update odds history when bets are placed
CREATE OR REPLACE FUNCTION public.update_odds_history()
RETURNS TRIGGER AS $$
DECLARE
    poll_stats RECORD;
    option_a_odds DECIMAL(10,2);
    option_b_odds DECIMAL(10,2);
BEGIN
    -- Calculate current stats
    SELECT 
        COALESCE(SUM(amount), 0) as total_volume,
        COALESCE(SUM(CASE WHEN option_chosen = 'A' THEN amount ELSE 0 END), 0) as option_a_volume,
        COALESCE(SUM(CASE WHEN option_chosen = 'B' THEN amount ELSE 0 END), 0) as option_b_volume
    INTO poll_stats
    FROM bets 
    WHERE poll_id = NEW.poll_id;
    
    -- Calculate odds (same logic as frontend)
    IF poll_stats.total_volume = 0 THEN
        option_a_odds := 2.0;
        option_b_odds := 2.0;
    ELSE
        IF poll_stats.option_a_volume = 0 THEN
            option_a_odds := 10.0;
        ELSE
            option_a_odds := GREATEST(1.01, LEAST(10.0, poll_stats.total_volume / poll_stats.option_a_volume));
        END IF;
        
        IF poll_stats.option_b_volume = 0 THEN
            option_b_odds := 10.0;
        ELSE
            option_b_odds := GREATEST(1.01, LEAST(10.0, poll_stats.total_volume / poll_stats.option_b_volume));
        END IF;
    END IF;
    
    -- Insert odds history record
    INSERT INTO public.odds_history (
        poll_id,
        option_a_odds,
        option_b_odds,
        option_a_percentage,
        option_b_percentage,
        total_volume
    ) VALUES (
        NEW.poll_id,
        option_a_odds,
        option_b_odds,
        CASE WHEN poll_stats.total_volume > 0 THEN (poll_stats.option_a_volume / poll_stats.total_volume) * 100 ELSE 50 END,
        CASE WHEN poll_stats.total_volume > 0 THEN (poll_stats.option_b_volume / poll_stats.total_volume) * 100 ELSE 50 END,
        poll_stats.total_volume
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update odds history when bets are placed
CREATE TRIGGER update_odds_history_trigger
    AFTER INSERT ON public.bets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_odds_history();