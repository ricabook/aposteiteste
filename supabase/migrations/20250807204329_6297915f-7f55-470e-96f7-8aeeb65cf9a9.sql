-- Corrigir função place_simple_bet para preencher odds e potential_payout
CREATE OR REPLACE FUNCTION public.place_simple_bet(_poll_id uuid, _user_id uuid, _option text, _amount numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_balance NUMERIC;
  new_balance NUMERIC;
  current_odds NUMERIC;
  potential_payout NUMERIC;
  result JSON;
BEGIN
  -- Check user balance
  SELECT wallet_balance INTO user_balance
  FROM profiles
  WHERE user_id = _user_id;
  
  IF user_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Perfil do usuário não encontrado');
  END IF;
  
  IF user_balance < _amount THEN
    RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;
  
  -- Get current odds for the option (before placing this bet)
  current_odds := get_simple_odds(_poll_id, _option);
  
  -- Calculate potential payout
  potential_payout := _amount * current_odds;
  
  -- Create bet record with odds and potential_payout
  INSERT INTO bets (user_id, poll_id, option_chosen, amount, odds, potential_payout)
  VALUES (_user_id, _poll_id, _option, _amount, current_odds, potential_payout);
  
  -- Update user balance
  new_balance := user_balance - _amount;
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
    'bet_placed',
    -_amount,
    'Aposta realizada - ' || _option
  );
  
  result := json_build_object(
    'success', true,
    'amount', _amount,
    'odds', current_odds,
    'potential_payout', potential_payout,
    'new_balance', new_balance
  );
  
  RETURN result;
END;
$function$