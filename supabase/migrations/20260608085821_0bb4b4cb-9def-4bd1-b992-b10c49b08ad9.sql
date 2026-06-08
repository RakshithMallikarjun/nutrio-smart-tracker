
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  age INT,
  gender TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  activity_level TEXT,
  goal_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Goals (one row per user)
CREATE TABLE public.goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calories INT NOT NULL DEFAULT 2200,
  protein INT NOT NULL DEFAULT 140,
  carbs INT NOT NULL DEFAULT 240,
  fat INT NOT NULL DEFAULT 70,
  fiber INT NOT NULL DEFAULT 30,
  water_ml INT NOT NULL DEFAULT 2500,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_goals" ON public.goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Meal entries
CREATE TABLE public.meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  serving TEXT NOT NULL,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  fiber NUMERIC NOT NULL DEFAULT 0,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  log_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date
);
CREATE INDEX meal_entries_user_date_idx ON public.meal_entries(user_id, log_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_entries TO authenticated;
GRANT ALL ON public.meal_entries TO service_role;
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_meals" ON public.meal_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Water entries
CREATE TABLE public.water_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity_ml INT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  log_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date
);
CREATE INDEX water_entries_user_date_idx ON public.water_entries(user_id, log_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_entries TO authenticated;
GRANT ALL ON public.water_entries TO service_role;
ALTER TABLE public.water_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_water" ON public.water_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + default goals on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.goals (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
