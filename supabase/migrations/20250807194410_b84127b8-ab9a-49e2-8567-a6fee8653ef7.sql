-- Create simple betting functions without shares logic

-- Simple bet placement function
CREATE OR REPLACE FUNCTION public.place_simple_bet(
  _poll_id UUID, 
  _user_id UUID, 
  _option TEXT, 
  _amount NUMERIC
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_balance NUMERIC;
  new_balance NUMERIC;
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
  
  -- Create bet record (using existing bets table structure)
  INSERT INTO bets (user_id, poll_id, option_chosen, amount)
  VALUES (_user_id, _poll_id, _option, _amount);
  
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
    'new_balance', new_balance
  );
  
  RETURN result;
END;
$$;

-- Function to get simple odds based on total volume
CREATE OR REPLACE FUNCTION public.get_simple_odds(_poll_id UUID, _option TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_volume_option NUMERIC;
  total_volume_all NUMERIC;
  odds NUMERIC;
BEGIN
  -- Get total volume for the specific option
  SELECT COALESCE(SUM(amount), 0) INTO total_volume_option
  FROM bets
  WHERE poll_id = _poll_id AND option_chosen = _option;
  
  -- Get total volume for all options
  SELECT COALESCE(SUM(amount), 0) INTO total_volume_all
  FROM bets
  WHERE poll_id = _poll_id;
  
  -- If no bets, return default odds of 2.0
  IF total_volume_all = 0 OR total_volume_option = 0 THEN
    RETURN 2.0;
  END IF;
  
  -- Calculate odds: total_volume / option_volume
  odds := total_volume_all / total_volume_option;
  
  -- Minimum odds of 1.01, maximum of 50.0
  RETURN GREATEST(1.01, LEAST(50.0, odds));
END;
$$;

-- Function to get user's simple bets
CREATE OR REPLACE FUNCTION public.get_user_bets(_user_id UUID, _poll_id UUID)
RETURNS TABLE(
  option_chosen TEXT,
  total_amount NUMERIC,
  bet_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bets.option_chosen,
    COALESCE(SUM(bets.amount), 0) as total_amount,
    COUNT(*) as bet_count
  FROM bets
  WHERE bets.user_id = _user_id AND bets.poll_id = _poll_id
  GROUP BY bets.option_chosen;
END;
$$;

-- Function to close/sell bet early
CREATE OR REPLACE FUNCTION public.close_simple_bet(
  _poll_id UUID,
  _user_id UUID, 
  _option TEXT,
  _amount NUMERIC
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path TO 'public'
AS $$
DECLARE
  user_balance NUMERIC;
  new_balance NUMERIC;
  user_total_bet NUMERIC;
  current_odds NUMERIC;
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
  
  -- Get current odds for payout calculation (simplified: just return 95% of bet amount)
  payout_amount := _amount * 0.95; -- 5% platform fee for early closure
  
  -- Get user balance
  SELECT wallet_balance INTO user_balance
  FROM profiles
  WHERE user_id = _user_id;
  
  -- Create negative bet record (represents selling/closing position)
  INSERT INTO bets (user_id, poll_id, option_chosen, amount)
  VALUES (_user_id, _poll_id, _option, -_amount);
  
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
    'Aposta encerrada antecipadamente - ' || _option
  );
  
  result := json_build_object(
    'success', true,
    'payout', payout_amount,
    'new_balance', new_balance
  );
  
  RETURN result;
END;
$$;