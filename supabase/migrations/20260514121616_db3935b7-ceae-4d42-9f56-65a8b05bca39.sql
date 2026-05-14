-- Display name animation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name_animation text DEFAULT 'none';

-- Per-chat settings table
CREATE TABLE IF NOT EXISTS public.chat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  nickname text,
  theme_type text DEFAULT 'preset',
  theme_value text DEFAULT 'default',
  blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own chat settings" ON public.chat_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own chat settings" ON public.chat_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own chat settings" ON public.chat_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own chat settings" ON public.chat_settings
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER chat_settings_touch_updated_at
  BEFORE UPDATE ON public.chat_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage bucket for chat backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-backgrounds', 'chat-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat bg public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-backgrounds');
CREATE POLICY "chat bg user upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "chat bg user update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'chat-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "chat bg user delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'chat-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);