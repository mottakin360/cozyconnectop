
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name_font text DEFAULT 'default';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name_color text;

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View reactions on visible messages"
ON public.message_reactions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.messages m
  WHERE m.id = message_reactions.message_id
    AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
));

CREATE POLICY "Add own reactions"
ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.id = message_reactions.message_id
      AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
  )
);

CREATE POLICY "Remove own reactions"
ON public.message_reactions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
