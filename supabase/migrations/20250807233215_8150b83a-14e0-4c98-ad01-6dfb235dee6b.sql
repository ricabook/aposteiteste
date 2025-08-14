-- Allow admins to update any profile for wallet management
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);