-- Criar política para permitir que admins possam excluir qualquer comentário
CREATE POLICY "Admins can delete any comment" 
ON public.poll_comments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));