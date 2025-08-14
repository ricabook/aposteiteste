-- Create a function to safely check if a user is an admin (visible to everyone)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_id_param AND role = 'admin'
  );
$$;

-- Create a function to get poll volume data that's accessible to everyone
CREATE OR REPLACE FUNCTION public.get_poll_volume_data(poll_id_param uuid)
RETURNS TABLE(
  option_chosen text,
  total_volume numeric,
  unique_bettors bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    bets.option_chosen,
    COALESCE(SUM(bets.amount), 0) as total_volume,
    COUNT(DISTINCT bets.user_id) as unique_bettors
  FROM public.bets
  WHERE bets.poll_id = poll_id_param 
    AND bets.amount > 0 
    AND bets.is_closed = false
  GROUP BY bets.option_chosen;
$$;