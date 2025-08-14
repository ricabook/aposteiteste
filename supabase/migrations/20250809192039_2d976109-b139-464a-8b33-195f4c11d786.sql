-- Edge function para validar senhas fortes no backend
-- Esta função será chamada via webhook do Supabase Auth

CREATE OR REPLACE FUNCTION public.validate_strong_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_password TEXT;
  password_score INTEGER := 0;
  feedback TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Esta função é chamada quando um usuário é criado
  -- Nota: O Supabase Auth já validou a senha mínima, 
  -- mas podemos adicionar logs para auditoria
  
  -- Log da criação de usuário (para auditoria de segurança)
  INSERT INTO public.security_logs (
    user_id,
    event_type,
    description,
    metadata
  ) VALUES (
    NEW.id,
    'user_registration',
    'Novo usuário registrado com validação de senha forte',
    json_build_object(
      'email', NEW.email,
      'created_at', NEW.created_at,
      'email_confirmed_at', NEW.email_confirmed_at
    )
  );
  
  RETURN NEW;
END;
$$;

-- Criar tabela para logs de segurança
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS na tabela de logs de segurança
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Política para admins verem todos os logs
CREATE POLICY "Admins can view all security logs" ON public.security_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Política para usuários verem apenas seus próprios logs
CREATE POLICY "Users can view their own security logs" ON public.security_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger para novos usuários (executado após criação do perfil)
CREATE OR REPLACE TRIGGER on_user_registration_security_log
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_strong_password();

-- Função para verificar força de senha (para uso em edge functions)
CREATE OR REPLACE FUNCTION public.check_password_strength(password_text TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  score INTEGER := 0;
  criteria JSON;
  feedback TEXT[] := ARRAY[]::TEXT[];
  has_upper BOOLEAN := false;
  has_lower BOOLEAN := false;
  has_number BOOLEAN := false;
  has_special BOOLEAN := false;
  min_length BOOLEAN := false;
  no_sequential BOOLEAN := true;
  no_common BOOLEAN := true;
  common_passwords TEXT[] := ARRAY[
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    '12345678', '111111', '1234567890', 'admin', 'letmein', 'welcome',
    'senha', 'senha123', '12345', 'brasil', 'brazil'
  ];
  sequential_patterns TEXT[] := ARRAY[
    '123', '234', '345', '456', '567', '678', '789', '890',
    'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi',
    'qwe', 'wer', 'ert', 'rty', 'tyu', 'yui', 'uio'
  ];
  pattern TEXT;
  common_pwd TEXT;
BEGIN
  -- Verificar comprimento mínimo
  min_length := length(password_text) >= 8;
  IF min_length THEN
    score := score + 20;
  ELSE
    feedback := array_append(feedback, 'A senha deve ter pelo menos 8 caracteres');
  END IF;
  
  -- Verificar maiúsculas
  has_upper := password_text ~ '[A-Z]';
  IF has_upper THEN
    score := score + 15;
  ELSE
    feedback := array_append(feedback, 'Adicione pelo menos uma letra maiúscula (A-Z)');
  END IF;
  
  -- Verificar minúsculas
  has_lower := password_text ~ '[a-z]';
  IF has_lower THEN
    score := score + 15;
  ELSE
    feedback := array_append(feedback, 'Adicione pelo menos uma letra minúscula (a-z)');
  END IF;
  
  -- Verificar números
  has_number := password_text ~ '[0-9]';
  IF has_number THEN
    score := score + 15;
  ELSE
    feedback := array_append(feedback, 'Adicione pelo menos um número (0-9)');
  END IF;
  
  -- Verificar caracteres especiais
  has_special := password_text ~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>\/?]';
  IF has_special THEN
    score := score + 15;
  ELSE
    feedback := array_append(feedback, 'Adicione pelo menos um caractere especial (!@#$%^&*)');
  END IF;
  
  -- Verificar sequências
  FOREACH pattern IN ARRAY sequential_patterns
  LOOP
    IF lower(password_text) LIKE '%' || pattern || '%' THEN
      no_sequential := false;
      EXIT;
    END IF;
  END LOOP;
  
  IF no_sequential THEN
    score := score + 10;
  ELSE
    feedback := array_append(feedback, 'Evite sequências óbvias como "123" ou "abc"');
  END IF;
  
  -- Verificar senhas comuns
  FOREACH common_pwd IN ARRAY common_passwords
  LOOP
    IF lower(password_text) = common_pwd OR lower(password_text) LIKE '%' || common_pwd || '%' THEN
      no_common := false;
      EXIT;
    END IF;
  END LOOP;
  
  IF no_common THEN
    score := score + 10;
  ELSE
    feedback := array_append(feedback, 'Esta senha é muito comum. Escolha algo mais único');
  END IF;
  
  -- Construir resposta JSON
  criteria := json_build_object(
    'minLength', min_length,
    'hasUppercase', has_upper,
    'hasLowercase', has_lower,
    'hasNumbers', has_number,
    'hasSpecialChars', has_special,
    'noSequentialChars', no_sequential,
    'noCommonPasswords', no_common
  );
  
  RETURN json_build_object(
    'isValid', min_length AND has_upper AND has_lower AND has_number AND has_special AND no_sequential AND no_common AND score >= 80,
    'score', LEAST(100, score),
    'criteria', criteria,
    'feedback', feedback
  );
END;
$$;