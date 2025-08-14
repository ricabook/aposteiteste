-- Add the missing category values one by one
ALTER TYPE poll_category ADD VALUE IF NOT EXISTS 'politica';

-- Add each value separately to ensure they are committed
COMMIT;