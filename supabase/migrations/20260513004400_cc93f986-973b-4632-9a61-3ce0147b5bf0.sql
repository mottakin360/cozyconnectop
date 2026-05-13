
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;

DROP POLICY IF EXISTS "Sender can delete own messages" ON public.messages;
CREATE POLICY "Sender can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receiver can mark as read" ON public.messages;
CREATE POLICY "Receiver can mark as read"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);
