-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create polls table
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  winning_option TEXT CHECK (winning_option IN ('A', 'B')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bets table
CREATE TABLE public.bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_chosen TEXT NOT NULL CHECK (option_chosen IN ('A', 'B')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  odds DECIMAL(8,4) NOT NULL CHECK (odds > 0),
  potential_payout DECIMAL(12,2) NOT NULL,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  payout_amount DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create wallet transactions table
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'bet_placed', 'bet_payout', 'admin_adjustment')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  bet_id UUID REFERENCES public.bets(id),
  admin_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create policies for polls
CREATE POLICY "Everyone can view active polls" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Only admins can manage polls" ON public.polls FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create policies for bets
CREATE POLICY "Users can view all bets" ON public.bets FOR SELECT USING (true);
CREATE POLICY "Users can place their own bets" ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for wallet_transactions
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON public.polls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to calculate odds based on bet volume
CREATE OR REPLACE FUNCTION public.calculate_odds(poll_id UUID, option TEXT)
RETURNS DECIMAL AS $$
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
$$ LANGUAGE plpgsql;