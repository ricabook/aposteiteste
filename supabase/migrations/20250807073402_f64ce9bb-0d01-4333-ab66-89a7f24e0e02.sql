-- Remove the constraint and add a new one that includes the existing admin_adjustment type
ALTER TABLE public.wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

-- Add constraint that includes all existing types plus new ones for shares
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
  'share_payout',
  'credit',
  'debit',
  'admin_adjustment'
));