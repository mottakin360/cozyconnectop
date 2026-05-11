import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { MessageCircle, Loader2, Check, X, Mail } from "lucide-react";

const searchSchema = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Pulse" },
      { name: "description", content: "Sign in or create your Pulse account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!authLoading && user) nav({ to: "/app" });
  }, [authLoading, user, nav]);

  return (
    <div className="relative min-h-screen gradient-hero">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-2xl border border-border bg-card/70 p-6 shadow-soft backdrop-blur md:p-8"
        >
          <Link to="/" className="mb-6 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Pulse</span>
          </Link>

          <h1 className="text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to keep the conversation going." : "Pick a unique username and join the pulse."}
          </p>

          <div className="mt-6">
            <GoogleButton />
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {mode === "signin" ? <SignInForm /> : <SignUpForm />}

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Don't have an account? " : "Already have one? "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) { toast.error(error.message); setLoading(false); }
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm font-medium hover:bg-secondary transition disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
        <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.7 2.5 2.5 6.7 2.5 12s4.2 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.5H12z"/></svg>
      )}
      Continue with Google
    </button>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Welcome back!");
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition disabled:opacity-60">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
      </button>
    </form>
  );
}

function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  useEffect(() => {
    if (!username) { setUsernameStatus("idle"); return; }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("username", username.toLowerCase()).maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus !== "available") { toast.error("Pick a valid, available username"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { username: username.toLowerCase(), display_name: displayName || username },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) {
      toast.success("Account created — welcome!");
    } else {
      setSubmitted(email);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-background/40 p-6 text-center"
      >
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full gradient-primary">
          <Mail className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{submitted}</span>.
          Click it to activate your account and start chatting.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Didn't get it? Check your spam folder.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Username</label>
        <div className="relative">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
            maxLength={20}
            required
            placeholder="cool_user_99"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {usernameStatus === "available" && <Check className="h-4 w-4 text-online" />}
            {(usernameStatus === "taken" || usernameStatus === "invalid") && <X className="h-4 w-4 text-destructive" />}
          </div>
        </div>
        {usernameStatus === "taken" && <p className="mt-1 text-xs text-destructive">That username is taken</p>}
        {usernameStatus === "invalid" && <p className="mt-1 text-xs text-destructive">3-20 chars, letters/numbers/underscore</p>}
        {usernameStatus === "available" && <p className="mt-1 text-xs text-online">Available</p>}
      </div>
      <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
      <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="Password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90 transition disabled:opacity-60">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create account
      </button>
    </form>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        {...props}
        className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
