-- Add option images columns to polls table
ALTER TABLE public.polls ADD COLUMN option_images JSONB;

-- Update the column to allow storing images for each option
-- This will store an array of objects like: [{"id": "A", "image_url": "..."}, {"id": "B", "image_url": "..."}]
COMMENT ON COLUMN public.polls.option_images IS 'JSON array storing image URLs for each poll option';