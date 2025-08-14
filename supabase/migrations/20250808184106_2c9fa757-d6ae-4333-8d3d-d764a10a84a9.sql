-- Add status field to polls table to track submission and approval status
ALTER TABLE public.polls 
ADD COLUMN status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'removed', 'resolved'));

-- Add submitted_at timestamp for tracking when polls are submitted by users
ALTER TABLE public.polls 
ADD COLUMN submitted_at timestamp with time zone DEFAULT now();

-- Add approved_at timestamp for tracking when polls are approved by admins
ALTER TABLE public.polls 
ADD COLUMN approved_at timestamp with time zone;

-- Add approved_by field to track which admin approved the poll
ALTER TABLE public.polls 
ADD COLUMN approved_by uuid REFERENCES auth.users(id);

-- Add removed_at timestamp for tracking when polls are removed (for auto-deletion)
ALTER TABLE public.polls 
ADD COLUMN removed_at timestamp with time zone;

-- Update existing polls created by admins to have approved status
UPDATE public.polls 
SET status = 'approved', 
    approved_at = created_at,
    approved_by = created_by
WHERE EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = polls.created_by 
  AND user_roles.role = 'admin'
);

-- Create index for efficient filtering
CREATE INDEX idx_polls_status ON public.polls(status);
CREATE INDEX idx_polls_submitted_at ON public.polls(submitted_at);
CREATE INDEX idx_polls_removed_at ON public.polls(removed_at);

-- Update RLS policies to show only approved polls to regular users
DROP POLICY IF EXISTS "Anyone can view active polls" ON public.polls;

CREATE POLICY "Anyone can view active approved polls" 
ON public.polls 
FOR SELECT 
USING (is_active = true AND status = 'approved');

-- Allow regular users to create polls with pending status
CREATE POLICY "Authenticated users can create pending polls" 
ON public.polls 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND 
  status = 'pending'
);

-- Allow users to view their own polls regardless of status
CREATE POLICY "Users can view their own polls" 
ON public.polls 
FOR SELECT 
USING (auth.uid() = created_by);

-- Function to auto-delete removed polls after 48 hours
CREATE OR REPLACE FUNCTION auto_delete_removed_polls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.polls 
  WHERE status = 'removed' 
    AND removed_at IS NOT NULL 
    AND removed_at < (now() - interval '48 hours');
END;
$$;