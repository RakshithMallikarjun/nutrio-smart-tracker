
-- Body weight log
CREATE TABLE public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  weight_kg numeric NOT NULL,
  log_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs TO authenticated;
GRANT ALL ON public.weight_logs TO service_role;

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY own_weight_logs ON public.weight_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_weight_logs_user_date ON public.weight_logs (user_id, log_date DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_weight_logs_updated_at
  BEFORE UPDATE ON public.weight_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profile additions for weight unit and longest streak
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_unit text NOT NULL DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0;
