import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Ban, ShieldCheck, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { THEME_PRESETS, resolveTheme } from "@/lib/chat-themes";
import { toast } from "sonner";

export type ChatSettings = {
  nickname: string | null;
  theme_type: string;
  theme_value: string;
  blocked: boolean;
};

export function ChatSettingsSheet({
  open,
  onClose,
  userId,
  friendId,
  friendDisplayName,
  fallbackAccent,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  friendId: string;
  friendDisplayName: string;
  fallbackAccent: string;
  initial: ChatSettings;
  onSaved: (s: ChatSettings) => void;
}) {
  const [nickname, setNickname] = useState(initial.nickname ?? "");
  const [themeType, setThemeType] = useState<string>(initial.theme_type || "preset");
  const [themeValue, setThemeValue] = useState<string>(initial.theme_value || "default");
  const [blocked, setBlocked] = useState(initial.blocked);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Gradient builder state
  const [g1, setG1] = useState("#ff6ec4");
  const [g2, setG2] = useState("#7873f5");
  const [gAngle, setGAngle] = useState(135);

  useEffect(() => {
    if (!open) return;
    setNickname(initial.nickname ?? "");
    setThemeType(initial.theme_type || "preset");
    setThemeValue(initial.theme_value || "default");
    setBlocked(initial.blocked);
  }, [open, initial]);

  const preview = resolveTheme(themeType, themeValue, fallbackAccent);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploading(true);
    const path = `${userId}/${friendId}-${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const { error } = await supabase.storage.from("chat-backgrounds").upload(path, f, { contentType: f.type, upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("chat-backgrounds").getPublicUrl(path);
    setThemeType("image"); setThemeValue(data.publicUrl);
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      user_id: userId,
      friend_id: friendId,
      nickname: nickname.trim() || null,
      theme_type: themeType,
      theme_value: themeValue,
      blocked,
    };
    const { error } = await (supabase as any)
      .from("chat_settings")
      .upsert(payload, { onConflict: "user_id,friend_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Chat settings saved");
    onSaved({ nickname: payload.nickname, theme_type: payload.theme_type, theme_value: payload.theme_value, blocked: payload.blocked });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-glow"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-bold">Chat settings · {friendDisplayName}</h2>
              <button onClick={onClose} className="rounded-md p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-thin">
              {/* Preview */}
              <div className="overflow-hidden rounded-2xl border border-border" style={{ background: preview.background }}>
                <div className="flex flex-col gap-2 p-4">
                  <div className="self-start max-w-[80%] rounded-2xl rounded-bl-md bg-bubble-other px-3 py-2 text-sm shadow-soft">Hey! What's up?</div>
                  <div className="self-end max-w-[80%] rounded-2xl rounded-br-md px-3 py-2 text-sm text-primary-foreground shadow-soft" style={{ background: preview.bubbleSelf || "var(--gradient-primary)" }}>Loving this theme 💫</div>
                </div>
              </div>

              {/* Nickname */}
              <Field label="Nickname (only you see this)">
                <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40}
                  placeholder={friendDisplayName}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </Field>

              {/* Theme presets */}
              <Field label="Theme presets">
                <div className="grid grid-cols-2 gap-2">
                  {THEME_PRESETS.map((p) => {
                    const active = themeType === "preset" && themeValue === p.id;
                    return (
                      <button key={p.id} type="button"
                        onClick={() => { setThemeType("preset"); setThemeValue(p.id); }}
                        className={`relative overflow-hidden rounded-xl border p-3 text-left transition ${active ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40"}`}
                        style={{ background: p.background }}>
                        <div className="rounded-md bg-black/30 px-2 py-1 text-xs font-bold text-white inline-block">{p.label}</div>
                        <div className="mt-6 text-[11px] text-white/90 drop-shadow">{p.description}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Custom color */}
              <Field label="Custom color">
                <div className="flex items-center gap-2">
                  <input type="color" value={themeType === "color" ? themeValue : "#5865F2"}
                    onChange={(e) => { setThemeType("color"); setThemeValue(e.target.value); }}
                    className="h-10 w-16 cursor-pointer rounded-md border border-border bg-transparent" />
                  <button type="button" onClick={() => { setThemeType("color"); setThemeValue("#5865F2"); }}
                    className={`rounded-lg border px-3 py-2 text-xs ${themeType === "color" ? "border-primary bg-primary/10" : "border-border"}`}>
                    Use solid color
                  </button>
                </div>
              </Field>

              {/* Gradient builder */}
              <Field label="Custom gradient">
                <div className="flex flex-wrap items-center gap-2">
                  <input type="color" value={g1} onChange={(e) => setG1(e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border border-border bg-transparent" />
                  <input type="color" value={g2} onChange={(e) => setG2(e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border border-border bg-transparent" />
                  <input type="number" min={0} max={360} value={gAngle} onChange={(e) => setGAngle(Number(e.target.value))} className="w-20 rounded-md border border-border bg-input px-2 py-2 text-sm" />
                  <button type="button" onClick={() => { setThemeType("gradient"); setThemeValue(`linear-gradient(${gAngle}deg, ${g1}, ${g2})`); }}
                    className="rounded-lg border border-border px-3 py-2 text-xs hover:bg-secondary">Apply gradient</button>
                </div>
              </Field>

              {/* Image upload */}
              <Field label="Background image">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-input px-3 py-4 text-sm hover:bg-secondary">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Uploading…" : "Upload an image (max 5MB)"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
              </Field>

              {/* Block / unblock */}
              <Field label="Friendship">
                <button type="button" onClick={() => setBlocked((b) => !b)}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${blocked ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" : "border-destructive/40 bg-destructive/10 text-destructive"}`}>
                  {blocked ? <><ShieldCheck className="h-4 w-4" /> Unblock {friendDisplayName}</> : <><Ban className="h-4 w-4" /> Block {friendDisplayName}</>}
                </button>
                <p className="mt-1 text-[11px] text-muted-foreground">Blocked friends are hidden from your sidebar and you won't see their messages.</p>
              </Field>
            </div>

            <div className="border-t border-border p-3">
              <button onClick={save} disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
