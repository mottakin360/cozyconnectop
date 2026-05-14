This is a large set of features. Here's the plan to ship them in one pass.

## 1. Display Name Animations (5 presets)

Add CSS keyframes in `src/styles.css` and an `ANIMATION_OPTIONS` list in `src/lib/display-name.ts`:
- **None** (default)
- **Rainbow** — hue-rotate cycle
- **Glow Pulse** — text-shadow pulse in accent color
- **Shimmer** — gradient sweep across text
- **Bounce** — gentle vertical bobbing
- **Gradient Flow** — animated multi-color gradient text

Settings page: add "Display name animation" picker with live preview. Apply via `displayNameStyle()` returning a `className` alongside style, used everywhere display name is shown (settings preview, friends list, DM header, message author).

DB: add `display_name_animation text default 'none'` to `profiles`.

## 2. Per-Chat Settings (theme, nickname, block)

New table `chat_settings`:
- `user_id` (owner of the setting), `friend_id`
- `nickname text` (overrides friend's display name in this user's view)
- `theme_type text` ('preset' | 'color' | 'gradient' | 'image')
- `theme_value text` (preset id, hex, gradient css, or image url)
- `blocked boolean default false`
- unique (user_id, friend_id)

RLS: user can only see/modify rows where `user_id = auth.uid()`.

When blocked: hide the friend's messages and prevent sending to them (RLS-friendly client-side filter; server-side enforcement deferred — noted as best-effort).

New storage bucket `chat-backgrounds` (public) for uploaded chat background images.

UI: gear icon in DM header opens a `ChatSettingsSheet` with:
- Nickname input
- Theme tabs: **Presets** | **Color** | **Gradient** | **Image**
- Preset grid (with previews):
  - **Love Blush** — pink/rose gradient, hearts accent
  - **Homie Hour** — warm orange/yellow casual vibe
  - **FWB** — pink-purple flirty-friendly gradient
  - **Midnight** — deep blue/indigo
  - **Forest** — green tones
- Custom color picker
- Gradient builder (two color stops + angle)
- Image upload (5MB max)
- Block/Unblock button

Apply theme as background of the DM message area; use nickname in friend list and DM header.

## 3. Voice Calling (WebRTC + voice changer)

Architecture:
- **Signaling**: Supabase Realtime broadcast channel `call:{userId}` for offer/answer/ICE.
- **Media**: peer-to-peer WebRTC `RTCPeerConnection` with public STUN (`stun:stun.l.google.com:19302`).
- **Voice changer**: Web Audio API graph — `MediaStreamSource → BiquadFilter (formant) → DynamicsCompressor → MediaStreamDestination`. Pitch is approximated using a `playbackRate`-style scriptlet via `AudioWorklet` (simple PSOLA-lite) OR, for simplicity v1, use a frequency-shift via biquad + delay. Presets:
  - **Normal**, **Chipmunk** (high), **Deep** (low), **Robot** (bitcrush + LFO), **Echo** (delay + feedback)

UI:
- Call button (phone icon) in DM header → opens `CallOverlay` (full-screen modal):
  - Avatar, name, status (Ringing / Connected / Ended), timer
  - Mute, Voice changer dropdown, End call
- Incoming call: global listener in `app.tsx` shows accept/decline overlay.

Limitations to call out to user up front:
- No TURN server → calls may fail behind strict NATs (works on most home networks).
- Voice changer is best-effort; true pitch-shift in-browser is limited without heavy DSP libs.
- Calls are 1:1 only.
- No call history/recording.

## 4. Database Migration

```sql
-- Display name animation
ALTER TABLE profiles ADD COLUMN display_name_animation text DEFAULT 'none';

-- Per-chat settings
CREATE TABLE chat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  nickname text,
  theme_type text DEFAULT 'preset',
  theme_value text DEFAULT 'default',
  blocked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON chat_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket for chat backgrounds
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-backgrounds', 'chat-backgrounds', true);
CREATE POLICY "chat bg public read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-backgrounds');
CREATE POLICY "chat bg user upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "chat bg user update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'chat-backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## File changes

**Created:**
- `src/lib/chat-themes.ts` — preset definitions
- `src/lib/voice-effects.ts` — Web Audio voice changer graph
- `src/components/chat/chat-settings-sheet.tsx`
- `src/components/chat/call-overlay.tsx`
- `src/hooks/use-call.tsx` — WebRTC + signaling
- migration SQL file

**Edited:**
- `src/lib/display-name.ts` — add animations + className helper
- `src/styles.css` — keyframes
- `src/routes/settings.tsx` — animation picker
- `src/routes/app.dm.$friendId.tsx` — gear + phone buttons, theme background, nickname, block enforcement
- `src/components/chat/friends-list-panel.tsx` — nickname, hide blocked
- `src/routes/app.tsx` — global incoming call listener

Approve to proceed; I'll run the migration first, then ship the code.