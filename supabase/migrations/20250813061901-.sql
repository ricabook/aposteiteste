-- Add status column to poll_comments table for moderation
ALTER TABLE public.poll_comments 
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';

-- Add check constraint for valid statuses
ALTER TABLE public.poll_comments 
ADD CONSTRAINT poll_comments_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing comments to be approved (for backward compatibility)
UPDATE public.poll_comments 
SET status = 'approved' 
WHERE status = 'pending';

-- Add index for better performance on status queries
CREATE INDEX idx_poll_comments_status ON public.poll_comments(status);

-- Update RLS policies to handle moderation
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.poll_comments;

-- Users can only view approved comments, admins can view all
CREATE POLICY "Users can view approved comments, admins view all" 
ON public.poll_comments 
FOR SELECT 
USING (
  status = 'approved' 
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Regular users create pending comments, admins can create approved comments
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.poll_comments;

CREATE POLICY "Users can create comments" 
ON public.poll_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    (has_role(auth.uid(), 'admin'::user_role) AND status IN ('pending', 'approved', 'rejected'))
    OR (NOT has_role(auth.uid(), 'admin'::user_role) AND status = 'pending')
  )
);

-- Add policy for admins to update comment status
CREATE POLICY "Admins can update comment status" 
ON public.poll_comments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));