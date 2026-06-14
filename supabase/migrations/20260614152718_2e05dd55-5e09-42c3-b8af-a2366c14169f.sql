ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notifications_prompt_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_consent_date TIMESTAMPTZ NULL;