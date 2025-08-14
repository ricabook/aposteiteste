-- Atualizar get_simple_odds para considerar apenas apostas ativas
CREATE OR REPLACE FUNCTION public.get_simple_odds(_poll_id uuid, _option text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_volume_option NUMERIC;
  total_volume_other NUMERIC;
  total_volume_all NUMERIC;
  odds NUMERIC;
BEGIN
  -- Get total volume for the specific option (only active bets)
  SELECT COALESCE(SUM(amount), 0) INTO total_volume_option
  FROM bets
  WHERE poll_id = _poll_id 
    AND option_chosen = _option 
    AND amount > 0 
    AND is_closed = FALSE;
  
  -- Get total volume for other options (only active bets)
  SELECT COALESCE(SUM(amount), 0) INTO total_volume_other
  FROM bets
  WHERE poll_id = _poll_id 
    AND option_chosen != _option 
    AND amount > 0 
    AND is_closed = FALSE;
  
  -- Get total volume for all options
  total_volume_all := total_volume_option + total_volume_other;
  
  -- If no bets, return default odds of 2.0
  IF total_volume_all = 0 OR total_volume_option = 0 THEN
    RETURN 2.0;
  END IF;
  
  -- If there are only bets on one side (no opposing bets), return 1.0 (no profit)
  -- This prevents P&L from being positive when there's only one bettor
  IF total_volume_other = 0 THEN
    RETURN 1.0;
  END IF;
  
  -- Calculate odds: total_volume / option_volume
  odds := total_volume_all / total_volume_option;
  
  -- Minimum odds of 1.01, maximum of 50.0
  RETURN GREATEST(1.01, LEAST(50.0, odds));
END;
$function$