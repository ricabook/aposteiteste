-- Verificar se o usuário atual tem papel de admin
DO $$
DECLARE
    current_user_id uuid := auth.uid();
    user_role_count integer;
BEGIN
    -- Verificar se o usuário atual tem o papel de admin
    SELECT count(*) INTO user_role_count 
    FROM user_roles 
    WHERE user_id = current_user_id AND role = 'admin';
    
    -- Se não tem papel de admin, adicionar
    IF user_role_count = 0 THEN
        INSERT INTO user_roles (user_id, role) 
        VALUES (current_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Admin role added for user %', current_user_id;
    ELSE
        RAISE NOTICE 'User % already has admin role', current_user_id;
    END IF;
END $$;

-- Atualizar política de upload para ser mais específica e evitar problemas de RLS
DROP POLICY IF EXISTS "Admins can upload poll images" ON storage.objects;

CREATE POLICY "Admins can upload poll images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'poll-images' AND 
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);