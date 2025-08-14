CREATE OR REPLACE FUNCTION public.execute_buy_order(_poll_id uuid, _user_id uuid, _option text, _quantity numeric, _max_price numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_price NUMERIC;
  total_cost NUMERIC;
  user_balance NUMERIC;
  new_balance NUMERIC;
  result JSON;
BEGIN
  -- Log function start
  RAISE LOG 'execute_buy_order started for user %, poll %, option %, quantity %, max_price %', 
    _user_id, _poll_id, _option, _quantity, _max_price;

  -- Get current market price
  current_price := get_market_price(_poll_id, _option);
  RAISE LOG 'Current market price: %', current_price;
  
  -- Use the lower of market price or max price
  current_price := LEAST(current_price, _max_price);
  RAISE LOG 'Final price after max_price check: %', current_price;
  
  -- Calculate total cost
  total_cost := _quantity * current_price;
  RAISE LOG 'Total cost calculated: %', total_cost;
  
  -- Check user balance
  SELECT wallet_balance INTO user_balance
  FROM profiles
  WHERE user_id = _user_id;
  
  RAISE LOG 'User balance from database: %, Required cost: %', user_balance, total_cost;
  
  IF user_balance IS NULL THEN
    RAISE LOG 'User balance is NULL - profile not found';
    RETURN json_build_object('success', false, 'error', 'Perfil do usuário não encontrado');
  END IF;
  
  -- Use a small tolerance (0.01 cents) to handle floating point precision issues
  IF user_balance < (total_cost - 0.01) THEN
    RAISE LOG 'Insufficient balance. User has: %, Needs: %', user_balance, total_cost;
    RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;
  
  RAISE LOG 'Balance check passed. Proceeding with purchase.';
  
  -- Create shares
  INSERT INTO shares (user_id, poll_id, option_chosen, quantity, price_paid, total_cost)
  VALUES (_user_id, _poll_id, _option, _quantity, current_price, total_cost);
  
  RAISE LOG 'Shares created successfully';
  
  -- Record trade
  INSERT INTO trades (buyer_id, seller_id, poll_id, option_chosen, quantity, price, buy_order_id)
  VALUES (_user_id, _user_id, _poll_id, _option, _quantity, current_price, gen_random_uuid());
  
  RAISE LOG 'Trade recorded successfully';
  
  -- Update user balance
  new_balance := user_balance - total_cost;
  UPDATE profiles 
  SET wallet_balance = new_balance
  WHERE user_id = _user_id;
  
  RAISE LOG 'User balance updated from % to %', user_balance, new_balance;
  
  -- Record transaction
  INSERT INTO wallet_transactions (
    user_id, 
    transaction_type, 
    amount, 
    description
  ) VALUES (
    _user_id,
    'share_purchase',
    -total_cost,
    'Compra de ' || _quantity || ' shares - ' || _option
  );
  
  RAISE LOG 'Transaction recorded successfully';
  
  result := json_build_object(
    'success', true, 
    'price', current_price,
    'quantity', _quantity,
    'total_cost', total_cost,
    'new_balance', new_balance
  );
  
  RAISE LOG 'Function completed successfully: %', result;
  
  RETURN result;
END;
$function$