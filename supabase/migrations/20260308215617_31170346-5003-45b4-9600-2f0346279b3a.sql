-- Function to validate an access key (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.validate_access_key(_key TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object('valid', true, 'plan', ak.plan, 'username', ak.username)
  INTO result
  FROM public.access_keys ak
  WHERE ak.key = _key
    AND ak.active = true
    AND ak.expires_at > now();

  IF result IS NULL THEN
    RETURN json_build_object('valid', false);
  END IF;

  RETURN result;
END;
$$;