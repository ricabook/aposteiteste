-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "Only admins can manage polls" ON public.polls;

-- Create more specific policies for polls management
CREATE POLICY "Admins can insert polls" 
ON public.polls 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update polls" 
ON public.polls 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete polls" 
ON public.polls 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Also ensure the select policy allows admins to see all polls
DROP POLICY IF EXISTS "Everyone can view active polls" ON public.polls;

CREATE POLICY "Everyone can view active polls" 
ON public.polls 
FOR SELECT 
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can view all polls" 
ON public.polls 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);