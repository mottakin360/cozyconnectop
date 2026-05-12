import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Settings, LogOut, Sun, Moon, Plus, Bell, Menu, X, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { FriendsListPanel } from "@/components/chat/friends-list-panel";
import { AddFriendDialog } from "@/components/chat/add-friend-dialog";
import { Avatar } from "@/components/chat/avatar";
import { displayNameStyle } from "@/lib/display-name";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, profile, loading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { theme, toggle } = useTheme();
  const [addOpen, setAddOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileSidebar, setMobileSidebar] = useState(true);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);


  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("friend_requests")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "pending");
      setPendingCount(count ?? 0);
    };
    load();
    const ch = supabase.channel("fr-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (loading || !user || !profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-xl gradient-primary shadow-glow" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {mobileSidebar && (
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="absolute inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-sidebar-border bg-sidebar md:relative md:translate-x-0"
          >
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
              <Link to="/app" className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg gradient-primary shadow-glow">
                  <MessageCircle className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight">Cozy Connect</span>
              </Link>
              <button onClick={() => setMobileSidebar(false)} className="rounded-md p-1.5 hover:bg-sidebar-accent md:hidden">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-3">
              <button
                onClick={() => setAddOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition"
              >
                <Plus className="h-4 w-4" /> Add Friend
              </button>
              <Link
                to="/app"
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-sidebar-border hover:bg-sidebar-accent transition"
                title="Friend requests"
              >
                <Bell className="h-4 w-4" />
                {pendingCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <FriendsListPanel currentUserId={user.id} />
            </div>

            {/* Profile bar */}
            <div className="flex items-center gap-2 border-t border-sidebar-border bg-sidebar-accent/40 p-2.5">
              <Avatar url={profile.avatar_url} name={profile.display_name} accent={profile.accent_color} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{profile.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
              </div>
              <button onClick={toggle} className="rounded-md p-2 hover:bg-sidebar-accent" title="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Link to="/settings" className="rounded-md p-2 hover:bg-sidebar-accent" title="Settings">
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={async () => { await signOut(); toast.success("Signed out"); nav({ to: "/" }); }}
                className="rounded-md p-2 hover:bg-sidebar-accent"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main pane */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <button
          onClick={() => setMobileSidebar((v) => !v)}
          className="absolute left-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-lg border border-border bg-card md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Outlet />
      </main>

      <AddFriendDialog open={addOpen} onClose={() => setAddOpen(false)} currentUserId={user.id} />
    </div>
  );
}
