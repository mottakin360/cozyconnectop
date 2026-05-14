import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createVoiceProcessor, type VoiceEffect, type VoiceProcessor } from "@/lib/voice-effects";

type CallStatus = "idle" | "outgoing" | "incoming" | "connected" | "ended";

type IncomingInfo = { fromUserId: string; fromName: string; fromAvatar: string | null };

type CallCtx = {
  status: CallStatus;
  peerId: string | null;
  peerName: string;
  peerAvatar: string | null;
  durationMs: number;
  muted: boolean;
  effect: VoiceEffect;
  startCall: (peerId: string, peerName: string, peerAvatar: string | null) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  setEffect: (e: VoiceEffect) => void;
};

const Ctx = createContext<CallCtx | undefined>(undefined);

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [peerName, setPeerName] = useState("");
  const [peerAvatar, setPeerAvatar] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [effect, setEffectState] = useState<VoiceEffect>("normal");
  const [durationMs, setDurationMs] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<VoiceProcessor | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const incomingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  // Hidden remote audio element
  useEffect(() => {
    const el = document.createElement("audio");
    el.autoplay = true;
    el.style.display = "none";
    document.body.appendChild(el);
    remoteAudioRef.current = el;
    return () => { el.remove(); };
  }, []);

  // Subscribe to my call channel for incoming signaling
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`call:${user.id}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "signal" }, (payload) => {
      handleSignal(payload.payload as any);
    }).subscribe();
    channelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Duration tick
  useEffect(() => {
    if (status === "connected") {
      startedAtRef.current = Date.now();
      tickRef.current = window.setInterval(() => setDurationMs(Date.now() - startedAtRef.current), 500);
    } else {
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
      if (status === "idle") setDurationMs(0);
    }
    return () => { if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; } };
  }, [status]);

  const sendTo = (toUserId: string, msg: any) => {
    const ch = supabase.channel(`call:${toUserId}`);
    ch.subscribe((s) => {
      if (s === "SUBSCRIBED") {
        ch.send({ type: "broadcast", event: "signal", payload: { ...msg, from: user?.id } }).finally(() => {
          setTimeout(() => supabase.removeChannel(ch), 200);
        });
      }
    });
  };

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    processorRef.current?.destroy();
    processorRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    incomingOfferRef.current = null;
    pendingIceRef.current = [];
  }, []);

  const buildPeerConnection = (remotePeerId: string) => {
    const pc = new RTCPeerConnection(ICE);
    pc.ontrack = (ev) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = ev.streams[0];
      }
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) sendTo(remotePeerId, { kind: "ice", candidate: ev.candidate.toJSON() });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") setStatus("connected");
      if (s === "failed" || s === "disconnected" || s === "closed") {
        setStatus((prev) => (prev === "ended" ? prev : "ended"));
        setTimeout(() => { cleanup(); setStatus("idle"); setPeerId(null); }, 1500);
      }
    };
    pcRef.current = pc;
    return pc;
  };

  const acquireMic = async () => {
    const raw = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    localStreamRef.current = raw;
    const proc = createVoiceProcessor(raw);
    processorRef.current = proc;
    proc.setEffect(effect);
    return proc.outputStream;
  };

  const handleSignal = async (msg: any) => {
    if (!user || !msg) return;
    const from = msg.from as string;
    if (msg.kind === "offer") {
      // Incoming call
      incomingOfferRef.current = msg.sdp;
      setPeerId(from);
      setPeerName(msg.fromName || "Unknown");
      setPeerAvatar(msg.fromAvatar || null);
      setStatus("incoming");
    } else if (msg.kind === "answer") {
      const pc = pcRef.current; if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      for (const c of pendingIceRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      pendingIceRef.current = [];
    } else if (msg.kind === "ice") {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingIceRef.current.push(msg.candidate);
      } else {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
      }
    } else if (msg.kind === "hangup") {
      setStatus("ended");
      setTimeout(() => { cleanup(); setStatus("idle"); setPeerId(null); }, 1200);
    } else if (msg.kind === "decline") {
      setStatus("ended");
      setTimeout(() => { cleanup(); setStatus("idle"); setPeerId(null); }, 1200);
    }
  };

  const startCall = async (toId: string, toName: string, toAvatar: string | null) => {
    if (!user) return;
    setPeerId(toId); setPeerName(toName); setPeerAvatar(toAvatar);
    setStatus("outgoing");
    const pc = buildPeerConnection(toId);
    const out = await acquireMic();
    out.getTracks().forEach((t) => pc.addTrack(t, out));
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    sendTo(toId, { kind: "offer", sdp: offer, fromName: profile?.display_name ?? "Unknown", fromAvatar: profile?.avatar_url ?? null });
  };

  const acceptCall = async () => {
    if (!peerId || !incomingOfferRef.current) return;
    const pc = buildPeerConnection(peerId);
    const out = await acquireMic();
    out.getTracks().forEach((t) => pc.addTrack(t, out));
    await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendTo(peerId, { kind: "answer", sdp: answer });
    for (const c of pendingIceRef.current) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    pendingIceRef.current = [];
  };

  const declineCall = () => {
    if (peerId) sendTo(peerId, { kind: "decline" });
    cleanup();
    setStatus("idle"); setPeerId(null);
  };

  const endCall = () => {
    if (peerId) sendTo(peerId, { kind: "hangup" });
    setStatus("ended");
    setTimeout(() => { cleanup(); setStatus("idle"); setPeerId(null); }, 800);
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  };

  const setEffect = (e: VoiceEffect) => {
    setEffectState(e);
    processorRef.current?.setEffect(e);
  };

  return (
    <Ctx.Provider value={{ status, peerId, peerName, peerAvatar, durationMs, muted, effect, startCall, acceptCall, declineCall, endCall, toggleMute, setEffect }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCall() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCall must be inside CallProvider");
  return c;
}
