-- Create function to get betting statistics for each option
CREATE OR REPLACE FUNCTION public.get_option_stats(poll_id uuid, option text)
RETURNS TABLE(
  total_bettors bigint,
  total_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT user_id) as total_bettors,
    COALESCE(SUM(total_cost), 0) as total_amount
  FROM shares 
  WHERE shares.poll_id = get_option_stats.poll_id 
    AND option_chosen = get_option_stats.option;
END;
$function$;