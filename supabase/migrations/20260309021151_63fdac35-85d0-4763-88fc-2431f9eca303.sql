
-- Drop all existing RESTRICTIVE policies on saved_tickets
DROP POLICY IF EXISTS "Anyone can delete tickets" ON public.saved_tickets;
DROP POLICY IF EXISTS "Anyone can insert tickets" ON public.saved_tickets;
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.saved_tickets;
DROP POLICY IF EXISTS "Anyone can view tickets" ON public.saved_tickets;

-- Create PERMISSIVE policies instead
CREATE POLICY "Anyone can view tickets" ON public.saved_tickets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tickets" ON public.saved_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tickets" ON public.saved_tickets FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tickets" ON public.saved_tickets FOR DELETE USING (true);
