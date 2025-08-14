-- Corrigir a função execute_sell_order que está causando erro de múltiplas linhas
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
  
  -- Get current market price
  current_price := get_market_price(_poll_id, _option);
  
  -- Calculate total proceeds
  total_proceeds := _quantity * current_price;
  
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
  
  -- Record trade
  INSERT INTO trades (buyer_id, seller_id, poll_id, option_chosen, quantity, price, buy_order_id)
  VALUES (_user_id, _user_id, _poll_id, _option, _quantity, current_price, gen_random_uuid());
  
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
    'Venda de ' || _quantity || ' shares - ' || _option
  );
  
  result := json_build_object(
    'success', true, 
    'price', current_price,
    'quantity', _quantity,
    'total_proceeds', total_proceeds,
    'new_balance', new_balance
  );
  
  RETURN result;
END;
$function$