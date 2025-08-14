-- Fix critical security issue: Remove anonymous access to poll_comments
-- This prevents user profiling and data harvesting

-- Drop the existing anonymous access policy
DROP POLICY IF EXISTS "Anyone can view comments" ON public.poll_comments;

-- Create new policy requiring authentication for viewing comments
CREATE POLICY "Authenticated users can view comments" 
ON public.poll_comments 
FOR SELECT 
TO authenticated
USING (true);

-- Also ensure we have proper policies for other operations (these should already exist but let's verify)
-- Users can create their own comments (already exists)
-- Users can update their own comments (already exists) 
-- Users can delete their own comments (already exists)

-- Add audit logging for admin role changes for enhanced security monitoring
CREATE OR REPLACE FUNCTION public.log_admin_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when admin roles are granted or revoked
  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    INSERT INTO public.admin_audit_logs (
      admin_user_id,
      target_user_id,
      action_type,
      details
    ) VALUES (
      auth.uid(),
      NEW.user_id,
      'admin_role_granted',
      json_build_object(
        'role', NEW.role,
        'timestamp', now()
      )
    );
  ELSIF TG_OP = 'DELETE' AND OLD.role = 'admin' THEN
    INSERT INTO public.admin_audit_logs (
      admin_user_id,
      target_user_id,
      action_type,
      details
    ) VALUES (
      auth.uid(),
      OLD.user_id,
      'admin_role_revoked',
      json_build_object(
        'role', OLD.role,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for admin role change auditing
DROP TRIGGER IF EXISTS audit_admin_role_changes ON public.user_roles;
CREATE TRIGGER audit_admin_role_changes
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_role_changes();