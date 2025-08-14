-- Update the poll_category enum with all new categories
DROP TYPE IF EXISTS poll_category CASCADE;

CREATE TYPE poll_category AS ENUM (
  'politica',
  'esportes', 
  'economia',
  'entretenimento',
  'tecnologia',
  'ciencia',
  'criptomoedas',
  'geopolitica'
);

-- Update the polls table to use the new enum
ALTER TABLE public.polls 
ALTER COLUMN category TYPE poll_category USING category::text::poll_category;