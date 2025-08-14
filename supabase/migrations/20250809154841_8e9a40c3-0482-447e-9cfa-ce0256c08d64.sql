-- Create banners table for admin-managed mini banners
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  button_text TEXT NOT NULL,
  button_url TEXT,
  background_color TEXT NOT NULL DEFAULT '#6366f1',
  background_gradient TEXT,
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Create policies for banners
CREATE POLICY "Banners are viewable by everyone" 
ON public.banners 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage banners" 
ON public.banners 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add trigger for timestamps
CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON public.banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default banners based on the image
INSERT INTO public.banners (title, button_text, button_url, background_color, background_gradient, image_url, position) VALUES 
('2024 Election Forecast', 'View', '#', '#6366f1', 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', '/lovable-uploads/0579019f-ee05-4bf7-ab12-798be1101a5e.png', 1),
('2024 Presidential Election', 'Trade now', '#', '#ef4444', 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)', '/lovable-uploads/1be6b174-c7c4-4d4c-a336-58fa20662193.png', 2),
('Mention Markets', 'Trade now', '#', '#8b5cf6', 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', '/lovable-uploads/2c906a0a-eac3-4a0b-bd07-bbcae1150e66.png', 3),
('Trade Elections', 'Sign Up', '#', '#10b981', 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', '/lovable-uploads/30d9a9e7-74f0-4b85-983a-6b2f5414e187.png', 4);