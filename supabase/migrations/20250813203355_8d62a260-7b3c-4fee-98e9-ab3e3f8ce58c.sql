-- Add the remaining missing category values
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'esportes';
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'economia';