import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { MessageCircle, Users, Sparkles, Image as ImageIcon, Lock, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse — Chat with friends in realtime" },
      { name: "description", content: "Modern realtime chat. Add friends by username, share images, stay connected." },
      { property: "og:title", content: "Pulse — Modern realtime chat" },
      { property: "og:description", content: "Add friends, send messages and images in realtime." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && user) nav({ to: "/app" });
  }, [loading, user, nav]);

  return (
    <div className="relative min-h-screen overflow-hidden gradient-hero">
      <div className="absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.4_0.05_270/0.15)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.4_0.05_270/0.15)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-glow">
            <MessageCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">Pulse</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth" className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-secondary transition">Sign in</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="rounded-lg gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90 transition">
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Realtime, secure, beautiful
          </div>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight md:text-7xl">
            Chat with friends,<br/>
            <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-primary bg-clip-text text-transparent">amplified</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            A modern, lightning-fast direct-message experience. Add friends by username, share images, and feel the conversation pulse in realtime.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }} className="rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition">
              Create your account
            </Link>
            <Link to="/auth" className="rounded-xl border border-border bg-card/50 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-card transition">
              Sign in
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3"
        >
          {[
            { icon: Zap, title: "Realtime sync", desc: "Messages appear instantly across every device." },
            { icon: Users, title: "Friends by username", desc: "Unique handles. Add anyone with a request." },
            { icon: ImageIcon, title: "Share images", desc: "Drop pictures right into the conversation." },
            { icon: Lock, title: "Secure auth", desc: "Email or Google sign-in, encrypted in transit." },
            { icon: Sparkles, title: "Custom profiles", desc: "Banner, accent color, bio — make it yours." },
            { icon: MessageCircle, title: "Beautiful UI", desc: "Dark by default. Animated. Distraction-free." },
          ].map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
              className="rounded-2xl border border-border bg-card/40 p-5 backdrop-blur hover:bg-card/70 transition"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
