-- Table to cache API responses with automatic TTL
CREATE TABLE public.api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read (anyone can read cache)
CREATE POLICY "Public can read cache"
  ON public.api_cache FOR SELECT
  USING (true);

-- Only backend (service role / authenticated admins) can write cache
-- We'll handle writes via security definer functions

-- Index for fast lookup by key
CREATE INDEX idx_api_cache_key ON public.api_cache (cache_key);

-- Index to help cleanup expired entries
CREATE INDEX idx_api_cache_expires ON public.api_cache (expires_at);

-- Function to get cache if not expired
CREATE OR REPLACE FUNCTION public.get_cache(_cache_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT data INTO result
  FROM public.api_cache
  WHERE cache_key = _cache_key
    AND expires_at > now();
  
  RETURN result;
END;
$$;

-- Function to set cache with TTL in seconds
CREATE OR REPLACE FUNCTION public.set_cache(_cache_key text, _data jsonb, _ttl_seconds int DEFAULT 300)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.api_cache (cache_key, data, expires_at)
  VALUES (_cache_key, _data, now() + (_ttl_seconds || ' seconds')::interval)
  ON CONFLICT (cache_key) DO UPDATE
  SET data = EXCLUDED.data,
      expires_at = EXCLUDED.expires_at,
      created_at = now();
END;
$$;

-- Function to cleanup expired cache entries (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.api_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;