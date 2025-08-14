-- Create deposits table to track deposit transactions
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Create policies for deposits
CREATE POLICY "Users can view their own deposits" 
ON public.deposits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposits" 
ON public.deposits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow system updates for completing deposits
CREATE POLICY "System can update deposits" 
ON public.deposits 
FOR UPDATE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_deposits_updated_at
BEFORE UPDATE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();