-- Modificar a tabela polls para suportar múltiplas opções
-- Adicionar colunas para armazenar opções como JSON
ALTER TABLE public.polls 
ADD COLUMN options JSONB;

-- Migrar dados existentes para o novo formato
UPDATE public.polls 
SET options = jsonb_build_array(
  jsonb_build_object('id', 'A', 'label', option_a),
  jsonb_build_object('id', 'B', 'label', option_b)
)
WHERE options IS NULL;