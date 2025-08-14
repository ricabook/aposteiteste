-- Add new transaction types for the Polymarket-style system
ALTER TABLE public.wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

ALTER TABLE public.wallet_transactions 
ADD CONSTRAINT wallet_transactions_transaction_type_check 
CHECK (transaction_type IN (
  'bet', 
  'bet_placed', 
  'bet_win', 
  'deposit', 
  'withdrawal', 
  'share_purchase', 
  'share_sale',
  'share_payout'
));