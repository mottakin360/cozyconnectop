import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/chat/avatar";
import { FONT_OPTIONS, displayNameStyle } from "@/lib/display-name";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Cozy Connect" }] }),
  component: SettingsPage,
});

const PRESET_COLORS = ["#5865F2", "#EB459E", "#ED4245", "#FAA61A", "#57F287", "#5BCEFA", "#F538DC", "#9B6BFF"];

function SettingsPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const nav = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [accent, setAccent] = useState("#5865F2");
  const [nameFont, setNameFont] = useState<string>("default");
  const [nameColor, setNameColor] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio ?? "");
      setAccent(profile.accent_color ?? "#5865F2");
      setNameFont(((profile as any).display_name_font as string) ?? "default");
      setNameColor(((profile as any).display_name_color as string) ?? "");
      setAvatarUrl(profile.avatar_url);
      setBannerUrl(profile.banner_url);
    }
  }, [profile]);

  const upload = async (bucket: "avatars" | "banners", file: File): Promise<string | null> => {
    if (!user) return null;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return null; }
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: true });
    if (error) { toast.error(error.message); return null; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const url = await upload("avatars", f);
    if (url) setAvatarUrl(url);
  };
  const onBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const url = await upload("banners", f);
    if (url) setBannerUrl(url);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || profile?.username,
      bio,
      accent_color: accent,
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
      display_name_font: nameFont,
      display_name_color: nameColor || null,
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Profile saved"); await refreshProfile(); }
  };

  if (loading || !profile) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/70 px-4 py-3 backdrop-blur">
        <Link to="/app" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-secondary"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="font-bold">Profile settings</h1>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {/* Banner */}
          <div
            className="relative h-36 cursor-pointer group"
            style={{
              background: bannerUrl ? `url(${bannerUrl}) center/cover` : `linear-gradient(135deg, ${accent}, color-mix(in oklab, ${accent} 50%, black))`,
            }}
            onClick={() => bannerRef.current?.click()}
          >
            <input ref={bannerRef} type="file" accept="image/*" hidden onChange={onBanner} />
            <div className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition group-hover:opacity-100">
              <span className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white"><Camera className="h-3.5 w-3.5" />Change banner</span>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="-mt-10 flex items-end gap-4">
              <button type="button" onClick={() => avatarRef.current?.click()} className="group relative" title="Change profile picture">
                <Avatar url={avatarUrl} name={displayName || profile.username} accent={accent} size={84} ring />
                <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <input ref={avatarRef} type="file" accept="image/*" hidden onChange={onAvatar} />
              </button>
              <button type="button" onClick={() => avatarRef.current?.click()} className="mb-1 flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                <Camera className="h-3.5 w-3.5" /> Change picture
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <Field label="Username (locked)">
                <input value={profile.username} disabled className="w-full cursor-not-allowed rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground" />
              </Field>
              <Field label="Display name">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  style={displayNameStyle(nameFont, nameColor)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="mt-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Preview: <span className="ml-1 text-base font-bold" style={displayNameStyle(nameFont, nameColor)}>{displayName || profile.username}</span>
                </div>
              </Field>
              <Field label="Display name font">
                <div className="flex flex-wrap gap-2">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNameFont(f.id)}
                      style={{ fontFamily: f.css || undefined }}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${nameFont === f.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Display name color">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setNameColor("")}
                    className={`h-8 rounded-full border-2 px-3 text-xs transition ${!nameColor ? "border-foreground" : "border-transparent bg-muted"}`}>
                    Default
                  </button>
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setNameColor(c)}
                      className={`h-8 w-8 rounded-full border-2 transition ${nameColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                  <input type="color" value={nameColor || "#ffffff"} onChange={(e) => setNameColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent" />
                </div>
              </Field>
              <Field label="Bio">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} placeholder="A short bio..." className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </Field>
              <Field label="Accent color">
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setAccent(c)}
                      className={`h-8 w-8 rounded-full border-2 transition ${accent === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                  <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-8 w-10 cursor-pointer rounded-md border border-border bg-transparent" />
                </div>
              </Field>
            </div>

            <button onClick={save} disabled={saving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
