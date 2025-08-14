-- Fix market price calculation to be based on total invested value, not share quantity
CREATE OR REPLACE FUNCTION public.get_market_price(poll_id uuid, option text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  last_trade_price NUMERIC;
  total_value_a NUMERIC;
  total_value_b NUMERIC;
  total_value NUMERIC;
BEGIN
  -- Get the last trade price
  SELECT price INTO last_trade_price
  FROM trades
  WHERE trades.poll_id = get_market_price.poll_id 
    AND option_chosen = option
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If we have a recent trade, use that price but validate against fundamentals
  IF last_trade_price IS NOT NULL THEN
    -- Still calculate based on total invested values for consistency
    SELECT 
      COALESCE(SUM(CASE WHEN option_chosen = 'A' THEN total_cost ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN option_chosen = 'B' THEN total_cost ELSE 0 END), 0)
    INTO total_value_a, total_value_b
    FROM shares
    WHERE shares.poll_id = get_market_price.poll_id;
    
    total_value := total_value_a + total_value_b;
    
    -- If total values are equal, return 0.5 regardless of last trade
    IF total_value > 0 AND ABS(total_value_a - total_value_b) < 0.01 THEN
      RETURN 0.50;
    END IF;
    
    -- Otherwise use last trade price but bounded by fundamentals
    IF total_value > 0 THEN
      IF option = 'A' THEN
        RETURN GREATEST(0.01, LEAST(0.99, (total_value_a / total_value + last_trade_price) / 2));
      ELSE
        RETURN GREATEST(0.01, LEAST(0.99, (total_value_b / total_value + last_trade_price) / 2));
      END IF;
    END IF;
    
    RETURN last_trade_price;
  END IF;
  
  -- Calculate based on current total invested values (not share quantity)
  SELECT 
    COALESCE(SUM(CASE WHEN option_chosen = 'A' THEN total_cost ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN option_chosen = 'B' THEN total_cost ELSE 0 END), 0)
  INTO total_value_a, total_value_b
  FROM shares
  WHERE shares.poll_id = get_market_price.poll_id;
  
  total_value := total_value_a + total_value_b;
  
  -- If no investments exist, return 0.5 (50% probability)
  IF total_value = 0 THEN
    RETURN 0.50;
  END IF;
  
  -- Calculate implied probability based on total invested values
  IF option = 'A' THEN
    RETURN GREATEST(0.01, LEAST(0.99, total_value_a / total_value));
  ELSE
    RETURN GREATEST(0.01, LEAST(0.99, total_value_b / total_value));
  END IF;
END;
$function$;