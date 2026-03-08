
CREATE TABLE public.saved_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'moderate',
  selections jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_odd numeric NOT NULL DEFAULT 0,
  confidence integer NOT NULL DEFAULT 0,
  suggested_stake text,
  potential_return text,
  result text DEFAULT 'pending' CHECK (result IN ('pending', 'green', 'red')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT ''
);

ALTER TABLE public.saved_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tickets" ON public.saved_tickets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert tickets" ON public.saved_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update tickets" ON public.saved_tickets FOR UPDATE TO anon, authenticated USING (true);
