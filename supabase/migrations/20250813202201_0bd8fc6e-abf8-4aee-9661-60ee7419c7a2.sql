-- Update the poll_category enum with all new categories
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'entretenimento';
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'tecnologia';  
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'ciencia';
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'criptomoedas';
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'geopolitica';

-- Note: We keep existing values and add new ones to avoid breaking existing data