-- Function to sell shares at current market price
CREATE OR REPLACE FUNCTION public.execute_sell_order(
  _poll_id UUID,
  _user_id UUID, 
  _option TEXT,
  _quantity NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_price NUMERIC;
  total_proceeds NUMERIC;
  user_balance NUMERIC;
  new_balance NUMERIC;
  user_shares NUMERIC;
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
  
  -- Remove shares (FIFO - first in, first out)
  WITH shares_to_remove AS (
    SELECT id, quantity,
           SUM(quantity) OVER (ORDER BY created_at) as running_total
    FROM shares
    WHERE user_id = _user_id 
      AND poll_id = _poll_id 
      AND option_chosen = _option
    ORDER BY created_at
  ),
  shares_affected AS (
    SELECT id, 
           CASE 
             WHEN running_total - quantity < _quantity THEN
               CASE 
                 WHEN running_total <= _quantity THEN quantity
                 ELSE _quantity - (running_total - quantity)
               END
             ELSE 0
           END as quantity_to_remove
    FROM shares_to_remove
    WHERE running_total - quantity < _quantity OR 
          (running_total >= _quantity AND running_total - quantity < _quantity)
  )
  DELETE FROM shares 
  WHERE id IN (
    SELECT id FROM shares_affected WHERE quantity_to_remove = quantity
  );
  
  -- Update partial shares if needed
  WITH shares_to_reduce AS (
    SELECT id, quantity,
           SUM(quantity) OVER (ORDER BY created_at) as running_total
    FROM shares
    WHERE user_id = _user_id 
      AND poll_id = _poll_id 
      AND option_chosen = _option
    ORDER BY created_at
  )
  UPDATE shares 
  SET quantity = quantity - (_quantity - (
    SELECT COALESCE(SUM(quantity), 0) 
    FROM shares 
    WHERE user_id = _user_id 
      AND poll_id = _poll_id 
      AND option_chosen = _option
      AND created_at < (SELECT created_at FROM shares WHERE id = shares.id)
  ))
  WHERE id = (
    SELECT id FROM shares_to_reduce 
    WHERE running_total >= _quantity 
    ORDER BY created_at 
    LIMIT 1
  )
  AND _quantity > (
    SELECT COALESCE(SUM(quantity), 0) 
    FROM shares 
    WHERE user_id = _user_id 
      AND poll_id = _poll_id 
      AND option_chosen = _option
      AND created_at < (SELECT created_at FROM shares WHERE id = shares.id)
  );
  
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
$$;