import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "./avatar";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { displayNameStyle } from "@/lib/display-name";

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null; accent_color: string | null; display_name_font: string | null; display_name_color: string | null };

export function FriendsListPanel({ currentUserId }: { currentUserId: string }) {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const params = useParams({ strict: false }) as { friendId?: string };

  const load = async () => {
    const { data } = await supabase
      .from("friendships")
      .select("user_a, user_b, a:user_a(id,username,display_name,avatar_url,accent_color,display_name_font,display_name_color), b:user_b(id,username,display_name,avatar_url,accent_color,display_name_font,display_name_color)")
      .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);
    const list: Profile[] = [];
    for (const row of (data ?? []) as any[]) {
      const other = row.user_a === currentUserId ? row.b : row.a;
      if (other) list.push(other);
    }
    list.sort((x, y) => x.display_name.localeCompare(y.display_name));
    setFriends(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("fr-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  return (
    <div className="px-2 py-2">
      <h3 className="px-2 pb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Friends · {friends.length}
      </h3>
      {loading ? (
        <div className="space-y-1">
          {[0,1,2].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-sidebar-accent/50" />)}
        </div>
      ) : friends.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sidebar-border p-4 text-center text-xs text-muted-foreground">
          No friends yet. Click <span className="font-semibold text-foreground">Add Friend</span> to get started.
        </div>
      ) : (
        <ul className="space-y-0.5">
          {friends.map((f) => {
            const active = params.friendId === f.id;
            return (
              <motion.li key={f.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                <Link
                  to="/app/dm/$friendId"
                  params={{ friendId: f.id }}
                  className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 transition ${active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"}`}
                >
                  <Avatar url={f.avatar_url} name={f.display_name} accent={f.accent_color} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{f.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{f.username}</p>
                  </div>
                  <MessageCircle className={`h-4 w-4 transition ${active ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100"}`} />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
