import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "connecting" | "live" | "ended";

const VapiWidget = () => {
  const { toast } = useToast();
  const vapiRef = useRef<Vapi | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("vapi-config");
        if (error || !data?.publicKey || !data?.assistantId) return;
        if (cancelled) return;
        const v = new Vapi(data.publicKey);
        assistantIdRef.current = data.assistantId;
        v.on("call-start", () => setStatus("live"));
        v.on("call-end", () => { setStatus("ended"); setIsSpeaking(false); });
        v.on("speech-start", () => setIsSpeaking(true));
        v.on("speech-end", () => setIsSpeaking(false));
        v.on("error", (e: unknown) => {
          console.error("Vapi error", e);
          setStatus("idle");
          toast({ title: "Voice call error", description: "Please try again.", variant: "destructive" });
        });
        vapiRef.current = v;
      } catch (e) {
        console.error("Vapi init failed", e);
      }
    })();
    return () => {
      cancelled = true;
      try { vapiRef.current?.stop(); } catch { /* noop */ }
    };
  }, [toast]);

  const startCall = async () => {
    if (!vapiRef.current || !assistantIdRef.current) {
      toast({ title: "Voice AI unavailable", description: "Please try again later.", variant: "destructive" });
      return;
    }
    setStatus("connecting");
    try {
      await vapiRef.current.start(assistantIdRef.current);
    } catch (e) {
      console.error(e);
      setStatus("idle");
      toast({ title: "Couldn't start call", description: "Allow microphone and try again.", variant: "destructive" });
    }
  };

  const endCall = () => {
    try { vapiRef.current?.stop(); } catch { /* noop */ }
    setStatus("idle");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="w-72 rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl p-5 shadow-[0_0_40px_hsl(160_100%_45%/0.25)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                "h-2 w-2 rounded-full",
                status === "live" ? "bg-primary animate-pulse" : status === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-muted",
              )} />
              <p className="font-display text-xs tracking-[0.2em] uppercase text-primary">
                {status === "live" ? (isSpeaking ? "AI Speaking" : "Listening") : status === "connecting" ? "Connecting" : "Voice AI"}
              </p>
            </div>
            <p className="text-sm text-foreground mb-4 leading-relaxed">
              Talk live with our AI agent about your project. No forms, just a conversation.
            </p>
            {status === "live" || status === "connecting" ? (
              <button
                onClick={endCall}
                className="w-full h-10 rounded-lg bg-destructive/90 hover:bg-destructive text-destructive-foreground font-display text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors"
              >
                <PhoneOff className="h-4 w-4" /> End Call
              </button>
            ) : (
              <button
                onClick={startCall}
                className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-display text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors"
              >
                <Mic className="h-4 w-4" /> Start Voice Chat
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open voice AI"
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center shadow-[0_0_30px_hsl(160_100%_45%/0.5)] transition-transform hover:scale-105",
          status === "live" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {status === "connecting" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Phone className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default VapiWidget;