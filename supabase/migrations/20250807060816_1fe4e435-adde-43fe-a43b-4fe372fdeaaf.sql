-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.calculate_odds(poll_id UUID, option TEXT)
RETURNS DECIMAL 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_a DECIMAL;
  total_b DECIMAL;
  option_total DECIMAL;
  other_total DECIMAL;
BEGIN
  -- Get total bet amounts for each option
  SELECT 
    COALESCE(SUM(CASE WHEN option_chosen = 'A' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN option_chosen = 'B' THEN amount ELSE 0 END), 0)
  INTO total_a, total_b
  FROM public.bets 
  WHERE bets.poll_id = calculate_odds.poll_id;
  
  -- If no bets yet, return default odds of 2.0
  IF total_a = 0 AND total_b = 0 THEN
    RETURN 2.0;
  END IF;
  
  -- Calculate odds using the formula: (total_pool / option_total)
  -- Add small buffer to prevent division by zero
  IF option = 'A' THEN
    option_total := total_a + 1;
    other_total := total_b + 1;
  ELSE
    option_total := total_b + 1;
    other_total := total_a + 1;
  END IF;
  
  -- Return odds (minimum 1.01, maximum 10.0)
  RETURN GREATEST(1.01, LEAST(10.0, (option_total + other_total) / option_total));
END;
$$;