-- Adicionar papel de admin para o usuário atual
INSERT INTO user_roles (user_id, role) 
VALUES ('488d77c0-172f-455d-ab62-c11c5717a2a2', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Corrigir a política de upload para storage
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