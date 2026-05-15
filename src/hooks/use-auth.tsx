import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  accent_color: string | null;
  display_name_font: string | null;
  display_name_color: string | null;
  display_name_animation: string | null;
  profile_decoration: string | null;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string, attempt = 0): Promise<void> => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (data) { setProfile(data as Profile); return; }
    // Profile row missing (trigger race or failure). Retry briefly, then self-heal by inserting.
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 400));
      return fetchProfile(uid, attempt + 1);
    }
    const { data: u } = await supabase.auth.getUser();
    const meta = (u.user?.user_metadata ?? {}) as Record<string, string>;
    const fallbackBase =
      (meta.username as string) ||
      (u.user?.email?.split("@")[0] || "user").replace(/[^a-zA-Z0-9_]/g, "") ||
      `user${uid.slice(0, 8)}`;
    const username = fallbackBase.slice(0, 16).toLowerCase();
    const display_name = (meta.display_name as string) || (meta.full_name as string) || username;
    const { data: inserted } = await supabase
      .from("profiles")
      .insert({ id: uid, username, display_name, avatar_url: meta.avatar_url ?? null })
      .select("*")
      .maybeSingle();
    setProfile((inserted as Profile | null) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => fetchProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) fetchProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (session?.user) await fetchProfile(session.user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, profile, loading, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
