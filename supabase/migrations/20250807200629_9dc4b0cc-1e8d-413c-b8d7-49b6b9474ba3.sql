-- Update the close_simple_bet function to use 10% fee instead of 5%
-- and ensure proper volume removal and odds recalculation

CREATE OR REPLACE FUNCTION public.close_simple_bet(_poll_id uuid, _user_id uuid, _option text, _amount numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_balance NUMERIC;
  new_balance NUMERIC;
  user_total_bet NUMERIC;
  payout_amount NUMERIC;
  result JSON;
BEGIN
  -- Check how much user has bet on this option
  SELECT COALESCE(SUM(amount), 0) INTO user_total_bet
  FROM bets
  WHERE user_id = _user_id AND poll_id = _poll_id AND option_chosen = _option;
  
  -- Check if user has enough bet amount to close
  IF user_total_bet < _amount THEN
    RETURN json_build_object('success', false, 'error', 'Valor insuficiente para encerrar');
  END IF;
  
  -- Calculate payout with 10% platform fee (return 90% of bet amount)
  payout_amount := _amount * 0.90;
  
  -- Get user balance
  SELECT wallet_balance INTO user_balance
  FROM profiles
  WHERE user_id = _user_id;
  
  -- Create negative bet record (represents closing/removing position from market)
  -- This will reduce the total volume for this option and affect odds calculation
  INSERT INTO bets (user_id, poll_id, option_chosen, amount, odds, potential_payout, is_settled)
  VALUES (_user_id, _poll_id, _option, -_amount, 1.0, 0, true);
  
  -- Update user balance
  new_balance := user_balance + payout_amount;
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
    'bet_closed',
    payout_amount,
    'Aposta encerrada antecipadamente - ' || _option || ' (taxa 10%)'
  );
  
  result := json_build_object(
    'success', true,
    'payout', payout_amount,
    'new_balance', new_balance,
    'fee_percentage', 10
  );
  
  RETURN result;
END;
$function$