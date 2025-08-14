-- Create shares table to replace the betting system with Polymarket-style trading
CREATE TABLE public.shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  poll_id UUID NOT NULL,
  option_chosen TEXT NOT NULL CHECK (option_chosen IN ('A', 'B')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price_paid NUMERIC NOT NULL CHECK (price_paid > 0 AND price_paid < 1),
  total_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table for buy/sell orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  poll_id UUID NOT NULL,
  option_chosen TEXT NOT NULL CHECK (option_chosen IN ('A', 'B')),
  order_type TEXT NOT NULL CHECK (order_type IN ('buy', 'sell')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price > 0 AND price < 1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'filled', 'cancelled')),
  filled_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trades table to record matched orders
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  poll_id UUID NOT NULL,
  option_chosen TEXT NOT NULL CHECK (option_chosen IN ('A', 'B')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price > 0 AND price < 1),
  buy_order_id UUID NOT NULL,
  sell_order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- RLS policies for shares
CREATE POLICY "Users can view all shares" 
ON public.shares FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own shares" 
ON public.shares FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS policies for orders
CREATE POLICY "Users can view all orders" 
ON public.orders FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" 
ON public.orders FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for trades
CREATE POLICY "Users can view all trades" 
ON public.trades FOR SELECT 
USING (true);

CREATE POLICY "System can create trades" 
ON public.trades FOR INSERT 
WITH CHECK (true);

-- Function to get current market price for an option
CREATE OR REPLACE FUNCTION public.get_market_price(poll_id UUID, option TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_trade_price NUMERIC;
  total_shares_a NUMERIC;
  total_shares_b NUMERIC;
BEGIN
  -- Get the last trade price
  SELECT price INTO last_trade_price
  FROM trades
  WHERE trades.poll_id = get_market_price.poll_id 
    AND option_chosen = option
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If we have a recent trade, use that price
  IF last_trade_price IS NOT NULL THEN
    RETURN last_trade_price;
  END IF;
  
  -- Otherwise, calculate based on current share distribution
  SELECT 
    COALESCE(SUM(CASE WHEN option_chosen = 'A' THEN quantity ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN option_chosen = 'B' THEN quantity ELSE 0 END), 0)
  INTO total_shares_a, total_shares_b
  FROM shares
  WHERE shares.poll_id = get_market_price.poll_id;
  
  -- If no shares exist, return 0.5 (50% probability)
  IF total_shares_a = 0 AND total_shares_b = 0 THEN
    RETURN 0.50;
  END IF;
  
  -- Calculate implied probability
  IF option = 'A' THEN
    RETURN GREATEST(0.01, LEAST(0.99, total_shares_a / (total_shares_a + total_shares_b)));
  ELSE
    RETURN GREATEST(0.01, LEAST(0.99, total_shares_b / (total_shares_a + total_shares_b)));
  END IF;
END;
$$;

-- Function to execute a buy order (creates shares instantly at market price)
CREATE OR REPLACE FUNCTION public.execute_buy_order(
  _poll_id UUID,
  _user_id UUID, 
  _option TEXT,
  _quantity NUMERIC,
  _max_price NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_price NUMERIC;
  total_cost NUMERIC;
  user_balance NUMERIC;
  new_balance NUMERIC;
  result JSON;
BEGIN
  -- Get current market price
  current_price := get_market_price(_poll_id, _option);
  
  -- Use the lower of market price or max price
  current_price := LEAST(current_price, _max_price);
  
  -- Calculate total cost
  total_cost := _quantity * current_price;
  
  -- Check user balance
  SELECT wallet_balance INTO user_balance
  FROM profiles
  WHERE user_id = _user_id;
  
  IF user_balance < total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;
  
  -- Create shares
  INSERT INTO shares (user_id, poll_id, option_chosen, quantity, price_paid, total_cost)
  VALUES (_user_id, _poll_id, _option, _quantity, current_price, total_cost);
  
  -- Record trade
  INSERT INTO trades (buyer_id, seller_id, poll_id, option_chosen, quantity, price, buy_order_id)
  VALUES (_user_id, _user_id, _poll_id, _option, _quantity, current_price, gen_random_uuid());
  
  -- Update user balance
  new_balance := user_balance - total_cost;
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
    'share_purchase',
    -total_cost,
    'Compra de ' || _quantity || ' shares - ' || _option
  );
  
  result := json_build_object(
    'success', true, 
    'price', current_price,
    'quantity', _quantity,
    'total_cost', total_cost,
    'new_balance', new_balance
  );
  
  RETURN result;
END;
$$;

-- Update odds_history to track share prices
DROP TRIGGER IF EXISTS update_odds_history_trigger ON bets;
DROP FUNCTION IF EXISTS public.update_odds_history();

CREATE OR REPLACE FUNCTION public.update_share_prices_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    price_a NUMERIC;
    price_b NUMERIC;
    total_shares_a NUMERIC;
    total_shares_b NUMERIC;
BEGIN
    -- Get current market prices
    price_a := get_market_price(NEW.poll_id, 'A');
    price_b := get_market_price(NEW.poll_id, 'B');
    
    -- Get total shares for volume calculation
    SELECT 
        COALESCE(SUM(CASE WHEN option_chosen = 'A' THEN quantity ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN option_chosen = 'B' THEN quantity ELSE 0 END), 0)
    INTO total_shares_a, total_shares_b
    FROM shares
    WHERE poll_id = NEW.poll_id;
    
    -- Update odds_history table with current prices
    INSERT INTO public.odds_history (
        poll_id,
        option_a_odds,
        option_b_odds,
        option_a_percentage,
        option_b_percentage,
        total_volume
    ) VALUES (
        NEW.poll_id,
        price_a,
        price_b,
        price_a * 100,
        price_b * 100,
        total_shares_a + total_shares_b
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger for shares
CREATE TRIGGER update_share_prices_history_trigger
AFTER INSERT ON public.shares
FOR EACH ROW
EXECUTE FUNCTION public.update_share_prices_history();

-- Create trigger for trades
CREATE TRIGGER update_share_prices_history_trigger_trades
AFTER INSERT ON public.trades
FOR EACH ROW
EXECUTE FUNCTION public.update_share_prices_history();