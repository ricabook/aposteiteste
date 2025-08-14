-- Migrate existing shares to bets for users who still have active positions
-- This will convert shares to equivalent bet amounts based on their total cost

-- Insert bets for all existing shares, grouped by user, poll, and option
INSERT INTO bets (user_id, poll_id, option_chosen, amount, odds, potential_payout, payout_amount, is_settled)
SELECT 
    s.user_id,
    s.poll_id,
    s.option_chosen,
    SUM(s.total_cost) as amount,
    2.0 as odds, -- Default odds
    SUM(s.total_cost) * 2.0 as potential_payout,
    0.00 as payout_amount,
    false as is_settled
FROM shares s
GROUP BY s.user_id, s.poll_id, s.option_chosen
HAVING SUM(s.total_cost) > 0;

-- Record wallet transactions for the migration
INSERT INTO wallet_transactions (user_id, transaction_type, amount, description)
SELECT DISTINCT
    s.user_id,
    'bet_placed',
    -SUM(s.total_cost) as amount,
    'Migração de shares para apostas - ' || s.option_chosen
FROM shares s
GROUP BY s.user_id, s.poll_id, s.option_chosen
HAVING SUM(s.total_cost) > 0;