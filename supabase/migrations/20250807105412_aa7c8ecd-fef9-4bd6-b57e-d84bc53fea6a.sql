-- First, let's update the get_market_price function to only consider active shares
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
  
  -- Calculate based on current total invested values from active shares only
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
  
  -- If we have a recent trade, use hybrid approach but bounded by fundamentals
  IF last_trade_price IS NOT NULL THEN
    -- If total values are equal, return 0.5 regardless of last trade
    IF ABS(total_value_a - total_value_b) < 0.01 THEN
      RETURN 0.50;
    END IF;
    
    -- Use weighted average of last trade price and fundamental value
    IF option = 'A' THEN
      RETURN GREATEST(0.01, LEAST(0.99, (total_value_a / total_value + last_trade_price) / 2));
    ELSE
      RETURN GREATEST(0.01, LEAST(0.99, (total_value_b / total_value + last_trade_price) / 2));
    END IF;
  END IF;
  
  -- Calculate implied probability based on total invested values
  IF option = 'A' THEN
    RETURN GREATEST(0.01, LEAST(0.99, total_value_a / total_value));
  ELSE
    RETURN GREATEST(0.01, LEAST(0.99, total_value_b / total_value));
  END IF;
END;
$function$;

-- Now let's update the execute_sell_order function to implement the new logic
CREATE OR REPLACE FUNCTION public.execute_sell_order(_poll_id uuid, _user_id uuid, _option text, _quantity numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_price NUMERIC;
  total_proceeds NUMERIC;
  user_balance NUMERIC;
  new_balance NUMERIC;
  user_shares NUMERIC;
  remaining_quantity NUMERIC;
  share_record RECORD;
  result JSON;
  user_investment_time TIMESTAMP;
  has_subsequent_bets BOOLEAN := false;
  total_user_cost NUMERIC := 0;
  avg_user_price NUMERIC;
BEGIN
  -- Check if user has enough shares
  SELECT COALESCE(SUM(quantity), 0) INTO user_shares
  FROM shares
  WHERE user_id = _user_id 
    AND poll_id = _poll_id 
    AND option_chosen = _option;
  
  IF user_shares < _quantity THEN
    RETURN json_build_object('success', false, 'error', 'Shares insuficientes');
  END IF;
  
  -- Get user's earliest investment time and average cost for this option
  SELECT 
    MIN(created_at),
    SUM(total_cost) / SUM(quantity)
  INTO user_investment_time, avg_user_price
  FROM shares
  WHERE user_id = _user_id 
    AND poll_id = _poll_id 
    AND option_chosen = _option;
  
  -- Check if there are any shares from other users created after user's first investment
  SELECT EXISTS(
    SELECT 1 
    FROM shares 
    WHERE poll_id = _poll_id 
      AND user_id != _user_id 
      AND created_at > user_investment_time
  ) INTO has_subsequent_bets;
  
  -- Get current market price
  current_price := get_market_price(_poll_id, _option);
  
  -- Calculate proceeds based on new logic
  IF has_subsequent_bets THEN
    -- User can profit if others bet after them (use current market price)
    total_proceeds := _quantity * current_price;
  ELSE
    -- User can only recover invested amount if no one bet after them
    total_proceeds := _quantity * avg_user_price;
  END IF;
  
  -- Get user balance
  SELECT wallet_balance INTO user_balance
  FROM profiles
  WHERE user_id = _user_id;
  
  -- Remove shares using FIFO (first in, first out)
  remaining_quantity := _quantity;
  
  FOR share_record IN 
    SELECT id, quantity, created_at
    FROM shares
    WHERE user_id = _user_id 
      AND poll_id = _poll_id 
      AND option_chosen = _option
    ORDER BY created_at ASC
  LOOP
    IF remaining_quantity <= 0 THEN
      EXIT;
    END IF;
    
    IF share_record.quantity <= remaining_quantity THEN
      -- Remove entire share record
      DELETE FROM shares WHERE id = share_record.id;
      remaining_quantity := remaining_quantity - share_record.quantity;
    ELSE
      -- Reduce quantity of this share record
      UPDATE shares 
      SET quantity = quantity - remaining_quantity
      WHERE id = share_record.id;
      remaining_quantity := 0;
    END IF;
  END LOOP;
  
  -- Record trade with actual sale price
  INSERT INTO trades (buyer_id, seller_id, poll_id, option_chosen, quantity, price, buy_order_id)
  VALUES (_user_id, _user_id, _poll_id, _option, _quantity, 
          CASE WHEN has_subsequent_bets THEN current_price ELSE avg_user_price END, 
          gen_random_uuid());
  
  -- Update user balance
  new_balance := user_balance + total_proceeds;
  UPDATE profiles 
  SET wallet_balance = new_balance
  WHERE user_id = _user_id;
  
  -- Record transaction
  INSERT INTO wallet_transactions (
    user_id, 
    transaction_type, 
    amount, 
    description
  ) VALUES (
    _user_id,
    'share_sale',
    total_proceeds,
    'Venda de ' || _quantity || ' shares - ' || _option || 
    CASE WHEN has_subsequent_bets THEN ' (com lucro potencial)' ELSE ' (reembolso)' END
  );
  
  result := json_build_object(
    'success', true, 
    'price', CASE WHEN has_subsequent_bets THEN current_price ELSE avg_user_price END,
    'quantity', _quantity,
    'total_proceeds', total_proceeds,
    'new_balance', new_balance,
    'has_subsequent_bets', has_subsequent_bets,
    'avg_user_price', avg_user_price
  );
  
  RETURN result;
END;
$function$;

-- Update the odds history trigger to only consider active shares
CREATE OR REPLACE FUNCTION public.update_share_prices_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    price_a NUMERIC;
    price_b NUMERIC;
    total_shares_a NUMERIC;
    total_shares_b NUMERIC;
BEGIN
    -- Get current market prices (now based only on active shares)
    price_a := get_market_price(NEW.poll_id, 'A');
    price_b := get_market_price(NEW.poll_id, 'B');
    
    -- Get total active shares for volume calculation
    SELECT 
        COALESCE(SUM(CASE WHEN option_chosen = 'A' THEN quantity ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN option_chosen = 'B' THEN quantity ELSE 0 END), 0)
    INTO total_shares_a, total_shares_b
    FROM shares
    WHERE poll_id = NEW.poll_id;
    
    -- Update odds_history table with current prices
    INSERT INTO public.odds_history (
        poll_id,
        option_a_odds,
        option_b_odds,
        option_a_percentage,
        option_b_percentage,
        total_volume
    ) VALUES (
        NEW.poll_id,
        price_a,
        price_b,
        price_a * 100,
        price_b * 100,
        total_shares_a + total_shares_b
    );
    
    RETURN NEW;
END;
$function$;

-- Update get_option_stats to only consider active shares
CREATE OR REPLACE FUNCTION public.get_option_stats(poll_id uuid, option text)
 RETURNS TABLE(total_bettors bigint, total_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT user_id) as total_bettors,
    COALESCE(SUM(total_cost), 0) as total_amount
  FROM shares 
  WHERE shares.poll_id = get_option_stats.poll_id 
    AND option_chosen = get_option_stats.option;
END;
$function$;