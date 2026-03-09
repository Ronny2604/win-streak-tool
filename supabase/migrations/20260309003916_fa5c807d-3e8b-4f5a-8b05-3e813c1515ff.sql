
CREATE TABLE public.tips_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  tip_type TEXT NOT NULL DEFAULT 'tip',
  fixture_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tips_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tips chat" ON public.tips_chat
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert tips" ON public.tips_chat
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tips" ON public.tips_chat
  FOR DELETE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.tips_chat;
