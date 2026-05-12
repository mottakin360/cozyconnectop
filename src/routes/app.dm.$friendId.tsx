import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ImagePlus, Loader2, ArrowLeft, Smile, Reply, X, SmilePlus } from "lucide-react";
import { Avatar } from "@/components/chat/avatar";
import { toast } from "sonner";
import { displayNameStyle } from "@/lib/display-name";
import { applyEmojiShortcuts } from "@/lib/emoji-shortcuts";

export const Route = createFileRoute("/app/dm/$friendId")({
  component: ChatPage,
});

type Profile = { id: string; username: string; display_name: string; avatar_url: string | null; banner_url: string | null; bio: string | null; accent_color: string | null; display_name_font?: string | null; display_name_color?: string | null };
type Message = { id: string; sender_id: string; receiver_id: string; content: string | null; image_url: string | null; created_at: string; reply_to_id?: string | null };
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👀"];

function ChatPage() {
  const { friendId } = Route.useParams();
  const { user } = useAuth();
  const [friend, setFriend] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", friendId).maybeSingle();
      if (active) setFriend(p as Profile | null);
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200);
      if (active && msgs) {
        setMessages(msgs as Message[]);
        const ids = (msgs as Message[]).map((m) => m.id);
        if (ids.length) {
          const { data: rxs } = await supabase.from("message_reactions" as any).select("*").in("message_id", ids);
          if (active) setReactions((rxs ?? []) as unknown as Reaction[]);
        }
      }
    })();
    return () => { active = false; };
  }, [user, friendId]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`dm-${user.id}-${friendId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        const involved = (m.sender_id === user.id && m.receiver_id === friendId) || (m.sender_id === friendId && m.receiver_id === user.id);
        if (involved) setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_reactions" }, (payload) => {
        const r = payload.new as Reaction;
        setReactions((prev) => prev.some((x) => x.id === r.id) ? prev : [...prev, r]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "message_reactions" }, (payload) => {
        const r = payload.old as Reaction;
        setReactions((prev) => prev.filter((x) => x.id !== r.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, friendId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const messagesById = useMemo(() => {
    const m = new Map<string, Message>();
    messages.forEach((x) => m.set(x.id, x));
    return m;
  }, [messages]);

  const send = async (content?: string, image_url?: string) => {
    if (!user) return;
    if (!content && !image_url) return;
    setSending(true);
    const payload: any = { sender_id: user.id, receiver_id: friendId, content: content ?? null, image_url: image_url ?? null };
    if (replyTo) payload.reply_to_id = replyTo.id;
    const { error } = await supabase.from("messages").insert(payload);
    setSending(false);
    if (error) toast.error(error.message);
    else setReplyTo(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = applyEmojiShortcuts(text).trim();
    if (!t) return;
    setText("");
    await send(t);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8MB"); return; }
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
    const { error: upErr } = await supabase.storage.from("chat-images").upload(path, file, { contentType: file.type });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
    setUploading(false);
    await send(undefined, data.publicUrl);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const mine = reactions.find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (mine) {
      const { error } = await supabase.from("message_reactions" as any).delete().eq("id", mine.id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.from("message_reactions" as any).insert({ message_id: messageId, user_id: user.id, emoji });
      if (error) toast.error(error.message);
    }
    setPickerFor(null);
  };

  if (!friend) {
    return <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const accent = friend.accent_color || "var(--primary)";
  const friendNameStyle = displayNameStyle(friend.display_name_font, friend.display_name_color);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Banner header */}
      <div className="relative">
        <div
          className="h-24 md:h-28"
          style={{
            background: friend.banner_url
              ? `url(${friend.banner_url}) center/cover`
              : `linear-gradient(135deg, ${accent}, color-mix(in oklab, ${accent} 50%, black))`,
          }}
        />
        <div className="flex items-end gap-3 border-b border-border bg-card/60 px-4 pb-3 pt-2 backdrop-blur md:px-5">
          <Link to="/app" className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card md:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="-mt-10">
            <Avatar url={friend.avatar_url} name={friend.display_name} accent={friend.accent_color} size={64} ring />
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h2 className="truncate text-lg font-bold" style={friendNameStyle}>{friend.display_name}</h2>
            <p className="truncate text-xs text-muted-foreground">@{friend.username} {friend.bio && <span className="ml-2 italic opacity-80">· {friend.bio}</span>}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const mine = m.sender_id === user!.id;
              const prev = messages[i - 1];
              const groupStart = !prev || prev.sender_id !== m.sender_id || (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()) > 5 * 60_000;
              const msgRx = reactions.filter((r) => r.message_id === m.id);
              const rxGroups = msgRx.reduce<Record<string, Reaction[]>>((acc, r) => { (acc[r.emoji] ||= []).push(r); return acc; }, {});
              const replied = m.reply_to_id ? messagesById.get(m.reply_to_id) : null;
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`group/msg relative flex gap-2 ${mine ? "justify-end" : "justify-start"} ${groupStart ? "mt-3" : ""}`}
                >
                  {!mine && groupStart && <Avatar url={friend.avatar_url} name={friend.display_name} accent={friend.accent_color} size={32} />}
                  {!mine && !groupStart && <div className="w-8 shrink-0" />}
                  <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    {groupStart && (
                      <span className={`mb-1 px-1 text-[11px] text-muted-foreground ${mine ? "text-right" : ""}`}>
                        <span style={mine ? undefined : friendNameStyle}>{mine ? "You" : friend.display_name}</span>
                        {" · "}
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {replied && (
                      <div className={`mb-1 max-w-full overflow-hidden rounded-lg border-l-2 px-2 py-1 text-xs text-muted-foreground ${mine ? "self-end" : "self-start"}`}
                        style={{ borderColor: accent, background: "color-mix(in oklab, currentColor 6%, transparent)" }}>
                        <div className="font-semibold opacity-80">
                          {replied.sender_id === user!.id ? "You" : friend.display_name}
                        </div>
                        <div className="truncate opacity-70">{replied.content || (replied.image_url ? "📷 Image" : "")}</div>
                      </div>
                    )}
                    {m.image_url && (
                      <a href={m.image_url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-border">
                        <img src={m.image_url} alt="shared" className="max-h-80 w-auto" loading="lazy" />
                      </a>
                    )}
                    {m.content && (
                      <div
                        className={`mt-1 rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-soft ${mine ? "rounded-br-md text-primary-foreground" : "rounded-bl-md bg-bubble-other"}`}
                        style={mine ? { background: "var(--gradient-primary)" } : undefined}
                      >
                        {m.content}
                      </div>
                    )}
                    {Object.keys(rxGroups).length > 0 && (
                      <div className={`mt-1 flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                        {Object.entries(rxGroups).map(([emoji, list]) => {
                          const reactedByMe = list.some((r) => r.user_id === user!.id);
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(m.id, emoji)}
                              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition hover:scale-105 ${reactedByMe ? "border-primary bg-primary/15" : "border-border bg-card"}`}
                            >
                              <span>{emoji}</span>
                              <span className="tabular-nums opacity-80">{list.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Hover actions — only for messages from the other person */}
                  {!mine && (
                    <div className="absolute -top-3 left-10 z-10 hidden items-center gap-1 rounded-lg border border-border bg-card p-0.5 shadow-soft group-hover/msg:flex">
                      <button
                        onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="React"
                      >
                        <SmilePlus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setReplyTo(m)}
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="Reply"
                      >
                        <Reply className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {pickerFor === m.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute -top-12 left-10 z-20 flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-1 shadow-glow"
                    >
                      {QUICK_EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => toggleReaction(m.id, e)}
                          className="h-8 w-8 rounded-full text-lg transition hover:scale-125 hover:bg-secondary"
                        >
                          {e}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {messages.length === 0 && (
            <div className="grid place-items-center py-20 text-center">
              <Smile className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Say hi to <span style={friendNameStyle}>{friend.display_name}</span>!</p>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <form onSubmit={onSubmit} className="border-t border-border bg-card/60 p-3 backdrop-blur md:p-4">
        <div className="mx-auto max-w-3xl">
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
              <Reply className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  Replying to <span style={friendNameStyle}>{friend.display_name}</span>
                </div>
                <div className="truncate text-muted-foreground">{replyTo.content || (replyTo.image_url ? "📷 Image" : "")}</div>
              </div>
              <button type="button" onClick={() => setReplyTo(null)} className="grid h-6 w-6 place-items-center rounded-md hover:bg-secondary">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-input px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-secondary transition disabled:opacity-50" title="Send image">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? `Reply to @${friend.username}` : `Message @${friend.username}`}
              maxLength={2000}
              className="flex-1 bg-transparent px-1 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground shadow-glow transition disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
