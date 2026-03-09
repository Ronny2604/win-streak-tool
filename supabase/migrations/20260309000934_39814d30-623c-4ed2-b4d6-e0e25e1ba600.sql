
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS border_radius TEXT DEFAULT 'medium';
