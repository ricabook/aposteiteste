-- Atualizar políticas RLS para permitir que usuários não logados vejam enquetes ativas
-- Remove a política existente que restringe apenas para admins
DROP POLICY IF EXISTS "Everyone can view active polls" ON public.polls;

-- Cria nova política mais permissiva para visualização de enquetes ativas
CREATE POLICY "Anyone can view active polls"
ON public.polls
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Mantém a política para admins verem todas as enquetes (ativas e inativas)
-- A política "Admins can view all polls" já existe e deve continuar funcionando