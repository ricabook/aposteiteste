-- Create function to handle wallet transactions
CREATE OR REPLACE FUNCTION public.execute_wallet_transaction(
  _user_id uuid,
  _amount numeric,
  _transaction_type text,
  _description text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT wallet_balance INTO current_balance
  FROM profiles
  WHERE user_id = _user_id;
  
  IF current_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User profile not found');
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance + _amount;
  
  -- Update user balance
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
    _transaction_type,
    _amount,
    _description
  );
  
  RETURN json_build_object(
    'success', true,
    'new_balance', new_balance,
    'transaction_amount', _amount
  );
END;
$function$;