-- Create a public function to check if a user is admin
-- This function can be called without authentication
CREATE OR REPLACE FUNCTION public.check_user_is_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_id_param AND role = 'admin'
  );
$$;