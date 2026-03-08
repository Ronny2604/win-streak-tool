-- Create access_keys table
CREATE TABLE public.access_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('lite', 'pro')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage keys
CREATE POLICY "Admins can view all keys" ON public.access_keys FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert keys" ON public.access_keys FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update keys" ON public.access_keys FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete keys" ON public.access_keys FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));