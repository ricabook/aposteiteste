-- First, add the missing categories that weren't added in the previous migration
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'politica';
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'esportes';
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'economia';

-- Update existing polls to use the new category values
UPDATE public.polls 
SET category = CASE 
  WHEN category = 'politics' THEN 'politica'
  WHEN category = 'sports' THEN 'esportes' 
  WHEN category = 'economics' THEN 'economia'
  WHEN category = 'entertainment' THEN 'entretenimento'
  WHEN category = 'technology' THEN 'tecnologia'
  WHEN category = 'science' THEN 'ciencia'
  WHEN category = 'crypto' THEN 'criptomoedas'
  WHEN category = 'other' THEN 'geopolitica'
  ELSE category
END
WHERE category IN ('politics', 'sports', 'economics', 'entertainment', 'technology', 'science', 'crypto', 'other');