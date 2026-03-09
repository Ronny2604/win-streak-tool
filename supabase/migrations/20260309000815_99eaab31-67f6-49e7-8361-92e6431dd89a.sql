
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS theme_preset TEXT DEFAULT 'emerald';
