import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PhoneOutgoing, RefreshCw } from "lucide-react";

interface CallLog {
  id: string;
  call_id: string | null;
  direction: string;
  status: string | null;
  from_number: string | null;
  to_number: string | null;
  duration_seconds: number | null;
  cost: number | null;
  summary: string | null;
  recording_url: string | null;
  ended_reason: string | null;
  created_at: string;
}

const AdminVapi = () => {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [context, setContext] = useState("");
  const [calling, setCalling] = useState(false);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("vapi_call_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data as CallLog[]) ?? []);
    setLoadingLogs(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const placeCall = async () => {
    if (!phone.trim()) {
      toast({ title: "Phone required", variant: "destructive" });
      return;
    }
    setCalling(true);
    try {
      const { data, error } = await supabase.functions.invoke("vapi-outbound", {
        body: { phoneNumber: phone, customerName: name || undefined, context: context || undefined },
      });
      if (error) throw error;
      toast({ title: "Call queued", description: `Vapi call ID: ${data?.call?.id ?? "—"}` });
      setPhone(""); setName(""); setContext("");
      fetchLogs();
    } catch (e) {
      toast({
        title: "Call failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCalling(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <PhoneOutgoing className="h-5 w-5 text-primary" /> Place Outbound AI Call
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vapi-phone">Phone number</Label>
              <Input id="vapi-phone" placeholder="+19517990953" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vapi-name">Customer name (optional)</Label>
              <Input id="vapi-name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vapi-context">Context for the AI (optional)</Label>
            <Textarea
              id="vapi-context"
              placeholder="Follow up on quote sent last Tuesday for the trading swarm project…"
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
          <Button onClick={placeCall} disabled={calling} className="font-display tracking-wider uppercase text-xs">
            {calling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Dialing…</> : <><PhoneOutgoing className="h-4 w-4 mr-2" /> Place Call</>}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Recent Calls</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No calls yet.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((l) => (
                <div key={l.id} className="rounded-lg border border-border bg-card/40 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="capitalize">{l.direction}</Badge>
                    {l.status && <Badge variant="secondary">{l.status}</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(l.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
                    <span><strong className="text-foreground">From:</strong> {l.from_number ?? "—"}</span>
                    <span><strong className="text-foreground">To:</strong> {l.to_number ?? "—"}</span>
                    <span>
                      <strong className="text-foreground">Duration:</strong>{" "}
                      {l.duration_seconds != null ? `${l.duration_seconds}s` : "—"}
                      {l.cost != null && <> · ${Number(l.cost).toFixed(2)}</>}
                    </span>
                  </div>
                  {l.summary && <p className="text-sm text-foreground/90 mb-2">{l.summary}</p>}
                  {l.recording_url && (
                    <audio controls src={l.recording_url} className="w-full h-8" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVapi;