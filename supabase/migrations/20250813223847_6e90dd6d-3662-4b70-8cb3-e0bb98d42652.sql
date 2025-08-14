-- Update resolve_poll function to use valid transaction type
CREATE OR REPLACE FUNCTION public.resolve_poll(_poll_id uuid, _winning_option text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  poll_record RECORD;
  bet_record RECORD;
  total_winning_bets NUMERIC := 0;
  total_losing_bets NUMERIC := 0;
  total_prize_pool NUMERIC := 0;
  platform_fee_rate NUMERIC := 0.10; -- 10% platform fee
  user_payout NUMERIC;
  user_proportion NUMERIC;
  winnings NUMERIC;
  net_winnings NUMERIC;
  platform_fee NUMERIC;
  total_payouts NUMERIC := 0;
  total_fees_collected NUMERIC := 0;
  result_data JSONB;
BEGIN
  -- Check if poll exists and is not already resolved
  SELECT * INTO poll_record
  FROM polls
  WHERE id = _poll_id AND is_resolved = FALSE;
  
  IF poll_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Poll not found or already resolved');
  END IF;
  
  -- Calculate total amounts for winning and losing bets (only active bets)
  SELECT 
    COALESCE(SUM(CASE WHEN option_chosen = _winning_option AND is_closed = FALSE THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN option_chosen != _winning_option AND is_closed = FALSE THEN amount ELSE 0 END), 0)
  INTO total_winning_bets, total_losing_bets
  FROM bets
  WHERE poll_id = _poll_id;
  
  -- Total prize pool is all the money bet
  total_prize_pool := total_winning_bets + total_losing_bets;
  
  -- Mark poll as resolved
  UPDATE polls 
  SET is_resolved = TRUE, winning_option = _winning_option
  WHERE id = _poll_id;
  
  -- If no one bet on the winning option, all money goes to platform
  IF total_winning_bets = 0 THEN
    -- All losing bets become platform fee
    total_fees_collected := total_losing_bets;
    
    -- Mark all bets as settled
    UPDATE bets 
    SET is_settled = TRUE, payout_amount = 0
    WHERE poll_id = _poll_id AND is_closed = FALSE;
    
    RETURN json_build_object(
      'success', true,
      'total_prize_pool', total_prize_pool,
      'total_winning_bets', total_winning_bets,
      'total_losing_bets', total_losing_bets,
      'total_payouts', 0,
      'total_fees_collected', total_fees_collected,
      'winners_count', 0
    );
  END IF;
  
  -- Process each winning bet
  FOR bet_record IN 
    SELECT * FROM bets 
    WHERE poll_id = _poll_id 
      AND option_chosen = _winning_option 
      AND is_closed = FALSE
    ORDER BY created_at ASC
  LOOP
    -- Calculate user's proportion of winning bets
    user_proportion := bet_record.amount / total_winning_bets;
    
    -- User gets their bet back + proportional share of losing bets
    winnings := total_losing_bets * user_proportion;
    
    -- Total payout before fees (original bet + winnings)
    user_payout := bet_record.amount + winnings;
    
    -- Apply 10% platform fee to the total payout
    platform_fee := user_payout * platform_fee_rate;
    net_winnings := user_payout - platform_fee;
    
    -- Update user balance
    UPDATE profiles 
    SET wallet_balance = wallet_balance + net_winnings
    WHERE user_id = bet_record.user_id;
    
    -- Record payout transaction using valid transaction type
    INSERT INTO wallet_transactions (
      user_id, 
      transaction_type, 
      amount, 
      description
    ) VALUES (
      bet_record.user_id,
      'admin_adjustment',
      net_winnings,
      'Ganhos da aposta - ' || _winning_option || ' (taxa 10%: R$ ' || ROUND(platform_fee, 2) || ')'
    );
    
    -- Mark bet as settled with payout amount
    UPDATE bets 
    SET is_settled = TRUE, payout_amount = net_winnings
    WHERE id = bet_record.id;
    
    -- Accumulate totals
    total_payouts := total_payouts + net_winnings;
    total_fees_collected := total_fees_collected + platform_fee;
  END LOOP;
  
  -- Mark all losing bets as settled (they get nothing)
  UPDATE bets 
  SET is_settled = TRUE, payout_amount = 0
  WHERE poll_id = _poll_id 
    AND option_chosen != _winning_option 
    AND is_closed = FALSE;
  
  -- Build result data
  result_data := json_build_object(
    'success', true,
    'poll_id', _poll_id,
    'winning_option', _winning_option,
    'total_prize_pool', total_prize_pool,
    'total_winning_bets', total_winning_bets,
    'total_losing_bets', total_losing_bets,
    'total_payouts', total_payouts,
    'total_fees_collected', total_fees_collected,
    'platform_fee_rate', platform_fee_rate,
    'winners_count', (SELECT COUNT(*) FROM bets WHERE poll_id = _poll_id AND option_chosen = _winning_option AND is_closed = FALSE)
  );
  
  RETURN result_data;
END;
$function$;