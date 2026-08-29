CREATE TABLE public.goods (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'kg',
  grade TEXT,
  market_location TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX goods_user_updated_idx ON public.goods (user_id, updated_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goods TO authenticated;
GRANT ALL ON public.goods TO service_role;
ALTER TABLE public.goods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own goods" ON public.goods FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.price_entries (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  good_id UUID NOT NULL,
  date DATE NOT NULL,
  close NUMERIC NOT NULL,
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  supply TEXT NOT NULL DEFAULT 'normal',
  demand TEXT NOT NULL DEFAULT 'normal',
  stock_level TEXT,
  volume_estimate NUMERIC,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX price_entries_user_good_date_key ON public.price_entries (user_id, good_id, date) WHERE deleted_at IS NULL;
CREATE INDEX price_entries_user_updated_idx ON public.price_entries (user_id, updated_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_entries TO authenticated;
GRANT ALL ON public.price_entries TO service_role;
ALTER TABLE public.price_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own price entries" ON public.price_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.notes (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  good_id UUID NOT NULL,
  date DATE NOT NULL,
  price_id UUID,
  direction TEXT NOT NULL DEFAULT 'neutral',
  reason_tag TEXT NOT NULL DEFAULT 'other',
  text TEXT NOT NULL DEFAULT '',
  impact TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX notes_user_updated_idx ON public.notes (user_id, updated_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own notes" ON public.notes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.season_profiles (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  good_id UUID NOT NULL,
  planting_months SMALLINT[] NOT NULL DEFAULT '{}',
  growing_months SMALLINT[] NOT NULL DEFAULT '{}',
  harvest_months SMALLINT[] NOT NULL DEFAULT '{}',
  peak_supply_months SMALLINT[] NOT NULL DEFAULT '{}',
  lean_months SMALLINT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, good_id)
);
CREATE INDEX season_profiles_user_updated_idx ON public.season_profiles (user_id, updated_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.season_profiles TO authenticated;
GRANT ALL ON public.season_profiles TO service_role;
ALTER TABLE public.season_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own season profiles" ON public.season_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());