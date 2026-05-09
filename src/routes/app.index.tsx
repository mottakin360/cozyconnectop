import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { MessageCircle, UserCheck, UserX, Loader2 } from "lucide-react";
import { Avatar } from "@/components/chat/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null; accent_color: string | null };
type Request = { id: string; sender_id: string; receiver_id: string; status: string; created_at: string; sender: Profile; receiver: Profile };

function AppHome() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<Request[]>([]);
  const [outgoing, setOutgoing] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friend_requests")
      .select("*, sender:sender_id(id,username,display_name,avatar_url,accent_color), receiver:receiver_id(id,username,display_name,avatar_url,accent_color)")
      .eq("status", "pending")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as Request[];
    setIncoming(rows.filter((r) => r.receiver_id === user.id));
    setOutgoing(rows.filter((r) => r.sender_id === user.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase.channel("fr-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const accept = async (id: string) => {
    const { error } = await supabase.rpc("accept_friend_request", { request_id: id });
    if (error) toast.error(error.message);
    else toast.success("Friend added");
  };
  const reject = async (id: string) => {
    const { error } = await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", id);
    if (error) toast.error(error.message); else toast("Request rejected");
  };
  const cancel = async (id: string) => {
    const { error } = await supabase.from("friend_requests").delete().eq("id", id);
    if (error) toast.error(error.message); else toast("Request cancelled");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3 pl-14 md:pl-4">
        <UserCheck className="h-5 w-5 text-primary" />
        <h1 className="font-semibold">Friend requests</h1>
      </header>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {loading ? (
          <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : incoming.length === 0 && outgoing.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mx-auto max-w-2xl space-y-6">
            {incoming.length > 0 && (
              <Section title={`Incoming · ${incoming.length}`}>
                {incoming.map((r) => (
                  <RequestRow key={r.id} profile={r.sender}
                    actions={
                      <>
                        <button onClick={() => accept(r.id)} className="rounded-lg bg-online/20 px-3 py-1.5 text-xs font-semibold text-online hover:bg-online/30 transition">Accept</button>
                        <button onClick={() => reject(r.id)} className="rounded-lg bg-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/30 transition">Reject</button>
                      </>
                    }
                  />
                ))}
              </Section>
            )}
            {outgoing.length > 0 && (
              <Section title={`Outgoing · ${outgoing.length}`}>
                {outgoing.map((r) => (
                  <RequestRow key={r.id} profile={r.receiver}
                    actions={<button onClick={() => cancel(r.id)} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/80 transition"><UserX className="inline h-3 w-3 mr-1"/>Cancel</button>}
                  />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RequestRow({ profile, actions }: { profile: Profile; actions: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
    >
      <Avatar url={profile.avatar_url} name={profile.display_name} accent={profile.accent_color} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{profile.display_name}</p>
        <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
      </div>
      <div className="flex gap-2">{actions}</div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="grid h-full place-items-center text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-primary shadow-glow">
          <MessageCircle className="h-8 w-8 text-primary-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-bold">It's quiet here</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add a friend by username, then pick a conversation from the sidebar to start chatting.
        </p>
      </div>
    </div>
  );
}
