-- Add required fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN nome_completo TEXT,
ADD COLUMN cpf TEXT;

-- Make these fields required by updating RLS policies
-- We'll handle the requirement in the application layer since these are for new users

-- Add unique constraint for CPF to prevent duplicates
ALTER TABLE public.profiles 
ADD CONSTRAINT unique_cpf UNIQUE (cpf);

-- Update the handle_new_user function to handle the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, nome_completo, cpf)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    NEW.raw_user_meta_data ->> 'nome_completo',
    NEW.raw_user_meta_data ->> 'cpf'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;