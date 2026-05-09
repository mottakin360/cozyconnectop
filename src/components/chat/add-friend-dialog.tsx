import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { X, Loader2, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./avatar";

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null; accent_color: string | null };

export function AddFriendDialog({ open, onClose, currentUserId }: { open: boolean; onClose: () => void; currentUserId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setQuery(""); setResults([]); return; }
  }, [open]);

  useEffect(() => {
    if (!query) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,accent_color")
        .ilike("username", `%${query.toLowerCase()}%`)
        .neq("id", currentUserId)
        .limit(10);
      setResults((data ?? []) as Profile[]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, currentUserId]);

  const sendRequest = async (receiverId: string) => {
    setSending(receiverId);
    const { error } = await supabase.from("friend_requests").insert({ sender_id: currentUserId, receiver_id: receiverId });
    setSending(null);
    if (error) {
      if (error.code === "23505") toast.error("Request already exists");
      else toast.error(error.message);
    } else {
      toast.success("Friend request sent");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold"><UserPlus className="h-5 w-5 text-primary" /> Add Friend</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Search by username to send a friend request.</p>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="username"
                className="w-full rounded-lg border border-border bg-input py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="mt-4 max-h-72 space-y-1 overflow-y-auto scrollbar-thin">
              {loading && <div className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
              {!loading && query && results.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No users found</p>
              )}
              {results.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary">
                  <Avatar url={p.avatar_url} name={p.display_name} accent={p.accent_color} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                  </div>
                  <button
                    onClick={() => sendRequest(p.id)}
                    disabled={sending === p.id}
                    className="flex items-center gap-1 rounded-lg gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-50"
                  >
                    {sending === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                    Add
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
