-- Table for user favorites (teams, fixtures)
CREATE TABLE public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  favorite_type TEXT NOT NULL CHECK (favorite_type IN ('team', 'fixture', 'league')),
  reference_id TEXT NOT NULL,
  reference_name TEXT NOT NULL,
  reference_logo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, favorite_type, reference_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON public.user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON public.user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Table for betting history / financial tracking
CREATE TABLE public.betting_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fixture_info TEXT NOT NULL,
  bet_type TEXT NOT NULL,
  stake NUMERIC NOT NULL DEFAULT 0,
  odd NUMERIC NOT NULL DEFAULT 1,
  potential_return NUMERIC GENERATED ALWAYS AS (stake * odd) STORED,
  result TEXT DEFAULT 'pending' CHECK (result IN ('pending', 'won', 'lost', 'void')),
  profit NUMERIC DEFAULT 0,
  notes TEXT,
  bet_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.betting_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own betting history"
  ON public.betting_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bets"
  ON public.betting_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bets"
  ON public.betting_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bets"
  ON public.betting_history FOR DELETE
  USING (auth.uid() = user_id);

-- Table for bankroll goals
CREATE TABLE public.bankroll_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'monthly')),
  target_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bankroll_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON public.bankroll_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON public.bankroll_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.bankroll_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.bankroll_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_user_favorites_user ON public.user_favorites (user_id);
CREATE INDEX idx_betting_history_user ON public.betting_history (user_id);
CREATE INDEX idx_betting_history_date ON public.betting_history (bet_date);
CREATE INDEX idx_bankroll_goals_user ON public.bankroll_goals (user_id);