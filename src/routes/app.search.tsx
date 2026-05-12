import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/chat/avatar";
import { displayNameStyle } from "@/lib/display-name";
import { Search, Loader2, UserPlus, MessageCircle, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/app/search")({
  head: () => ({ meta: [{ title: "Search — Cozy Connect" }] }),
  component: SearchPage,
});

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string | null;
  bio: string | null;
  display_name_font: string | null;
  display_name_color: string | null;
};

type RelState = "friend" | "outgoing" | "incoming" | "none";

function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rels, setRels] = useState<Record<string, RelState>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const q = query.trim().replace(/[%_]/g, "\\$&");
      const { data } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,accent_color,bio,display_name_font,display_name_color")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq("id", user.id)
        .limit(25);
      const rows = ((data ?? []) as any[]) as ProfileRow[];
      setResults(rows);
      setLoading(false);

      if (rows.length) {
        const ids = rows.map((r) => r.id);
        const [{ data: friends }, { data: reqs }] = await Promise.all([
          supabase.from("friendships").select("user_a,user_b").or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
          supabase.from("friend_requests").select("sender_id,receiver_id,status").eq("status", "pending")
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
        ]);
        const map: Record<string, RelState> = {};
        for (const id of ids) map[id] = "none";
        for (const f of (friends ?? []) as any[]) {
          const other = f.user_a === user.id ? f.user_b : f.user_a;
          if (other in map) map[other] = "friend";
        }
        for (const r of (reqs ?? []) as any[]) {
          const other = r.sender_id === user.id ? r.receiver_id : r.sender_id;
          if (!(other in map) || map[other] === "friend") continue;
          map[other] = r.sender_id === user.id ? "outgoing" : "incoming";
        }
        setRels(map);
      } else {
        setRels({});
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query, user]);

  const sendRequest = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const { error } = await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: id });
    setBusy(null);
    if (error) {
      if (error.code === "23505") toast.error("Request already exists");
      else toast.error(error.message);
    } else {
      toast.success("Friend request sent");
      setRels((r) => ({ ...r, [id]: "outgoing" }));
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-border bg-card/60 px-4 py-3 backdrop-blur md:px-6">
        <h1 className="text-lg font-bold">Search people</h1>
        <p className="text-xs text-muted-foreground">Find users by username or display name.</p>
        <div className="relative mt-3 max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 md:px-6">
        <div className="mx-auto max-w-2xl">
          {loading && (
            <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">No users matched "{query}"</p>
          )}
          {!query.trim() && (
            <p className="py-10 text-center text-sm text-muted-foreground">Start typing to search...</p>
          )}
          <ul className="space-y-2">
            {results.map((p, i) => {
              const rel = rels[p.id] ?? "none";
              return (
                <motion.li key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft">
                    <Avatar url={p.avatar_url} name={p.display_name} accent={p.accent_color} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={displayNameStyle(p.display_name_font, p.display_name_color)}>
                        {p.display_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">@{p.username}{p.bio && <span className="ml-2 italic opacity-80">· {p.bio}</span>}</p>
                    </div>
                    {rel === "friend" ? (
                      <Link to="/app/dm/$friendId" params={{ friendId: p.id }}
                        className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-secondary">
                        <MessageCircle className="h-3.5 w-3.5" /> Message
                      </Link>
                    ) : rel === "outgoing" ? (
                      <span className="flex items-center gap-1 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Requested
                      </span>
                    ) : rel === "incoming" ? (
                      <span className="flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground">
                        <Check className="h-3.5 w-3.5" /> Pending your reply
                      </span>
                    ) : (
                      <button
                        onClick={() => sendRequest(p.id)}
                        disabled={busy === p.id}
                        className="flex items-center gap-1 rounded-lg gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
                      >
                        {busy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Add
                      </button>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
