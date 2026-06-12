CREATE TABLE public.custom_foods (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null,
  name text not null,
  category text not null default 'My Foods',
  serving text not null,
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  fiber numeric not null default 0,
  diet text,
  source text default 'user',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_foods TO authenticated;
GRANT ALL ON public.custom_foods TO service_role;

ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_custom_foods ON public.custom_foods
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX custom_foods_user_idx ON public.custom_foods(user_id);