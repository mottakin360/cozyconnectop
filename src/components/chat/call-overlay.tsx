import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Wand2 } from "lucide-react";
import { useCall } from "@/hooks/use-call";
import { Avatar } from "@/components/chat/avatar";
import { VOICE_EFFECTS } from "@/lib/voice-effects";

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

export function CallOverlay() {
  const c = useCall();
  const visible = c.status !== "idle";
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-glow"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className={`absolute inset-0 rounded-full ${c.status === "outgoing" || c.status === "incoming" ? "animate-ping bg-primary/30" : ""}`} />
                <Avatar url={c.peerAvatar} name={c.peerName} accent={null} size={128} ring />
              </div>
              <h2 className="mt-5 text-2xl font-bold">{c.peerName || "Calling…"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.status === "outgoing" && "Calling…"}
                {c.status === "incoming" && "Incoming voice call"}
                {c.status === "connected" && `Connected · ${fmt(c.durationMs)}`}
                {c.status === "ended" && "Call ended"}
              </p>

              {c.status === "connected" && (
                <div className="mt-6 flex w-full flex-col gap-3">
                  <label className="flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 text-sm">
                    <Wand2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Voice</span>
                    <select
                      value={c.effect}
                      onChange={(e) => c.setEffect(e.target.value as any)}
                      className="ml-auto bg-transparent text-sm outline-none"
                    >
                      {VOICE_EFFECTS.map((v) => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <div className="mt-6 flex items-center justify-center gap-4">
                {c.status === "incoming" ? (
                  <>
                    <button onClick={c.declineCall} className="grid h-14 w-14 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-glow hover:scale-105 transition" title="Decline">
                      <PhoneOff className="h-6 w-6" />
                    </button>
                    <button onClick={c.acceptCall} className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-glow hover:scale-105 transition" title="Accept">
                      <Phone className="h-6 w-6" />
                    </button>
                  </>
                ) : (
                  <>
                    {c.status === "connected" && (
                      <button onClick={c.toggleMute} className={`grid h-12 w-12 place-items-center rounded-full border border-border ${c.muted ? "bg-destructive text-destructive-foreground" : "bg-secondary"}`} title="Mute">
                        {c.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </button>
                    )}
                    <button onClick={c.endCall} className="grid h-14 w-14 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-glow hover:scale-105 transition" title="End">
                      <PhoneOff className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
