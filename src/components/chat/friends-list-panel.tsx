import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "./avatar";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { displayNameStyle, displayNameClass } from "@/lib/display-name";

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null; accent_color: string | null; display_name_font: string | null; display_name_color: string | null; display_name_animation: string | null };
type FriendItem = Profile & { unread: number; lastAt: number; nickname: string | null; blocked: boolean };

export function FriendsListPanel({ currentUserId }: { currentUserId: string }) {
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const params = useParams({ strict: false }) as { friendId?: string };
  const activeFriendId = params.friendId;

  const load = async () => {
    const cols = "id,username,display_name,avatar_url,accent_color,display_name_font,display_name_color,display_name_animation";
    const { data: rels } = await supabase
      .from("friendships")
      .select(`user_a, user_b, a:user_a(${cols}), b:user_b(${cols})`)
      .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);
    const profiles: Profile[] = [];
    for (const row of (rels ?? []) as any[]) {
      const other = row.user_a === currentUserId ? row.b : row.a;
      if (other) profiles.push(other);
    }

    const { data: msgs } = await supabase
      .from("messages")
      .select("id,sender_id,receiver_id,created_at,read_at")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false })
      .limit(500);

    const { data: settings } = await (supabase as any)
      .from("chat_settings")
      .select("friend_id,nickname,blocked")
      .eq("user_id", currentUserId);
    const settingsMap = new Map<string, { nickname: string | null; blocked: boolean }>();
    for (const s of (settings ?? []) as any[]) settingsMap.set(s.friend_id, { nickname: s.nickname ?? null, blocked: !!s.blocked });

    const lastByFriend = new Map<string, number>();
    const unreadByFriend = new Map<string, number>();
    for (const m of (msgs ?? []) as any[]) {
      const friendId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;
      const t = new Date(m.created_at).getTime();
      if (!lastByFriend.has(friendId) || t > (lastByFriend.get(friendId) as number)) lastByFriend.set(friendId, t);
      if (m.receiver_id === currentUserId && !m.read_at && (!activeFriendId || activeFriendId !== friendId)) {
        unreadByFriend.set(friendId, (unreadByFriend.get(friendId) ?? 0) + 1);
      }
    }

    const list: FriendItem[] = profiles
      .map((p) => {
        const s = settingsMap.get(p.id);
        return {
          ...p,
          nickname: s?.nickname ?? null,
          blocked: s?.blocked ?? false,
          unread: unreadByFriend.get(p.id) ?? 0,
          lastAt: lastByFriend.get(p.id) ?? 0,
        };
      })
      .filter((f) => !f.blocked);

    list.sort((x, y) => {
      if ((y.unread > 0 ? 1 : 0) - (x.unread > 0 ? 1 : 0) !== 0) return (y.unread > 0 ? 1 : 0) - (x.unread > 0 ? 1 : 0);
      if (y.lastAt !== x.lastAt) return y.lastAt - x.lastAt;
      return (x.nickname || x.display_name).localeCompare(y.nickname || y.display_name);
    });

    setFriends(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("fr-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_settings", filter: `user_id=eq.${currentUserId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, activeFriendId]);

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
            const active = activeFriendId === f.id;
            const shown = f.nickname || f.display_name;
            return (
              <motion.li key={f.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
                <Link
                  to="/app/dm/$friendId"
                  params={{ friendId: f.id }}
                  className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 transition ${active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"}`}
                >
                  <div className="relative">
                    <Avatar url={f.avatar_url} name={shown} accent={f.accent_color} size={36} />
                    {f.unread > 0 && (
                      <span className="absolute -right-1 -top-1 grid h-2.5 w-2.5 place-items-center rounded-full bg-primary ring-2 ring-sidebar" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`flex items-center gap-1.5 truncate text-sm font-semibold ${f.nickname ? "" : displayNameClass(f.display_name_animation)}`}
                       style={f.nickname ? undefined : displayNameStyle(f.display_name_font, f.display_name_color)}>
                      {shown}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">@{f.username}</p>
                  </div>
                  {f.unread > 0 ? (
                    <span className="grid min-w-[1.25rem] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-glow">
                      {f.unread > 99 ? "99+" : f.unread}
                    </span>
                  ) : (
                    <MessageCircle className={`h-4 w-4 transition ${active ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100"}`} />
                  )}
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
