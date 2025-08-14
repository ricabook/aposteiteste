-- Adicionar campo para identificar apostas encerradas/canceladas
ALTER TABLE public.bets ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE;

-- Atualizar função close_simple_bet com sintaxe corrigida
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
  current_odds NUMERIC;
  current_position_value NUMERIC;
  pnl NUMERIC;
  base_payout NUMERIC;
  payout_amount NUMERIC;
  closed_amount NUMERIC := 0;
  remaining_to_close NUMERIC;
  remaining_bet NUMERIC;
  bet_record RECORD;
  result JSON;
BEGIN
  -- Check how much user has bet on this option (only active bets)
  SELECT COALESCE(SUM(amount), 0) INTO user_total_bet
  FROM bets
  WHERE user_id = _user_id 
    AND poll_id = _poll_id 
    AND option_chosen = _option
    AND is_closed = FALSE;
  
  -- Check if user has enough bet amount to close
  IF user_total_bet < _amount THEN
    RETURN json_build_object('success', false, 'error', 'Valor insuficiente para encerrar');
  END IF;
  
  -- Get current odds for the option
  current_odds := get_simple_odds(_poll_id, _option);
  
  -- Calculate current position value (what the bet would be worth now)
  current_position_value := _amount * current_odds;
  
  -- Calculate P&L (current value - initial bet amount)
  pnl := current_position_value - _amount;
  
  -- Calculate base payout based on P&L
  IF pnl >= 0 THEN
    -- P&L is positive: user gets only initial amount (ignores positive P&L)
    base_payout := _amount;
  ELSE
    -- P&L is negative: user gets (initial amount - negative P&L)
    -- Since pnl is negative, subtracting it actually adds the loss
    base_payout := _amount + pnl; -- This is _amount - abs(pnl)
  END IF;
  
  -- Apply 10% platform fee to the base payout
  payout_amount := base_payout * 0.90;
  
  -- Ensure payout is not negative
  payout_amount := GREATEST(0, payout_amount);
  
  -- Get user balance
  SELECT wallet_balance INTO user_balance
  FROM profiles
  WHERE user_id = _user_id;
  
  -- Mark existing bets as closed instead of creating negative records
  -- Use a cursor to close bets FIFO (First In, First Out)
  FOR bet_record IN 
    SELECT id, amount
    FROM bets
    WHERE user_id = _user_id 
      AND poll_id = _poll_id 
      AND option_chosen = _option
      AND is_closed = FALSE
    ORDER BY created_at ASC
  LOOP
    EXIT WHEN closed_amount >= _amount;
    
    IF (closed_amount + bet_record.amount) <= _amount THEN
      -- Close this entire bet
      UPDATE bets 
      SET is_closed = TRUE 
      WHERE id = bet_record.id;
      closed_amount := closed_amount + bet_record.amount;
    ELSE
      -- Partially close this bet - split it
      remaining_to_close := _amount - closed_amount;
      remaining_bet := bet_record.amount - remaining_to_close;
      
      -- Mark original bet as closed with the closed amount
      UPDATE bets 
      SET is_closed = TRUE, amount = remaining_to_close
      WHERE id = bet_record.id;
      
      -- Create new bet for the remaining amount
      INSERT INTO bets (user_id, poll_id, option_chosen, amount, odds, potential_payout, is_closed)
      SELECT user_id, poll_id, option_chosen, remaining_bet, odds, (remaining_bet * odds), FALSE
      FROM bets 
      WHERE id = bet_record.id
      LIMIT 1;
      
      closed_amount := _amount;
    END IF;
  END LOOP;
  
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
    'Aposta encerrada antecipadamente - ' || _option || ' (taxa 10%, P&L: ' || ROUND(pnl, 2) || ')'
  );
  
  result := json_build_object(
    'success', true,
    'payout', payout_amount,
    'base_payout', base_payout,
    'pnl', pnl,
    'current_odds', current_odds,
    'new_balance', new_balance,
    'fee_percentage', 10
  );
  
  RETURN result;
END;
$function$