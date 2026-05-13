import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, Mail, Phone, Building, ChevronDown, ChevronUp, Calendar, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./AdminProjectList";

const formatSlot = (s: string) => {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
};

interface ProjectSummary {
  client_id: string;
  count: number;
  totalPaid: number;
}

interface AdminClientsProps {
  profiles: Record<string, Profile & { phone?: string | null; avatar_url?: string | null }>;
  projectSummaries: ProjectSummary[];
  loading: boolean;
  onClientCreated?: () => void;
}

interface OnboardingRow {
  id: string;
  client_id: string;
  company_name: string;
  industry: string;
  team_size: string;
  website: string;
  primary_goal: string;
  pain_points: string;
  existing_tools: string;
  package_interest: string;
  budget_range: string;
  timeline: string;
  project_summary: string;
  preferred_slots: string[] | null;
  timezone: string;
  status: string;
  current_step: number;
  submitted_at: string | null;
  confirmed_call_at: string | null;
}

const AdminClients = ({ profiles, projectSummaries, loading, onClientCreated }: AdminClientsProps) => {
  const [onboarding, setOnboarding] = useState<Record<string, OnboardingRow>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", company_name: "", phone: "" });
  const { toast } = useToast();

  const submitNewClient = async () => {
    if (!form.email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-create-client", { body: form });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast({ title: "Error", description: error?.message || (data as any)?.error || "Failed", variant: "destructive" });
      return;
    }
    toast({ title: "Client added", description: "They'll receive a password setup email." });
    setForm({ email: "", full_name: "", company_name: "", phone: "" });
    setAddOpen(false);
    onClientCreated?.();
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("client_onboarding").select("*");
      if (data) {
        const map: Record<string, OnboardingRow> = {};
        (data as OnboardingRow[]).forEach((r) => { map[r.client_id] = r; });
        setOnboarding(map);
      }
    })();
  }, []);

  const confirmSlot = async (row: OnboardingRow, slot: string) => {
    setConfirming(row.id);
    // Best-effort parse — fall back to now+1 day if unparseable
    const parsed = new Date(slot);
    const iso = isNaN(parsed.getTime()) ? new Date(Date.now() + 86400000).toISOString() : parsed.toISOString();
    const { error } = await supabase.from("client_onboarding")
      .update({ confirmed_call_at: iso, status: "call_scheduled" })
      .eq("id", row.id);
    if (!error) setOnboarding((prev) => ({ ...prev, [row.client_id]: { ...row, confirmed_call_at: iso, status: "call_scheduled" } }));
    setConfirming(null);
  };

  if (loading) return <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>;

  const clients = Object.values(profiles);

  const addClientDialog = (
    <Dialog open={addOpen} onOpenChange={setAddOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 font-display text-xs tracking-wider uppercase">
          <UserPlus className="h-4 w-4" /> Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display">Add New Client</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Full name</label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
            <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Acme Inc." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 123 4567" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submitNewClient} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create Client
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (clients.length === 0) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-base font-semibold text-foreground">All Clients</h2>
        {addClientDialog}
      </div>
      <div className="text-center py-16">
        <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground font-display">No clients yet</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-base font-semibold text-foreground">All Clients</h2>
        {addClientDialog}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {clients.map((client, i) => {
          const summary = projectSummaries.find((s) => s.client_id === client.id);
          const ob = onboarding[client.id];
          const isOpen = expanded === client.id;
          return (
            <motion.div key={client.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glass-card neon-border">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-semibold text-foreground">{client.full_name}</h3>
                      {client.company_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3" /> {client.company_name}
                        </p>
                      )}
                      {(client as any).phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {(client as any).phone}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground items-center">
                        <Badge variant="secondary">{summary?.count || 0} projects</Badge>
                        <span className="font-display font-semibold text-foreground">
                          ${(summary?.totalPaid || 0).toLocaleString()} paid
                        </span>
                        {ob && (
                          <Badge className={
                            ob.status === "submitted" ? "bg-accent/30 text-accent" :
                            ob.status === "call_scheduled" ? "bg-primary/30 text-primary" :
                            ob.status === "completed" ? "bg-primary/50 text-primary-foreground" :
                            "bg-muted text-muted-foreground"
                          }>
                            Onboarding: {ob.status.replace("_", " ")}
                          </Badge>
                        )}
                      </div>
                      {ob && (
                        <Button
                          variant="ghost" size="sm"
                          className="mt-3 h-7 px-2 gap-1 text-xs"
                          onClick={() => setExpanded(isOpen ? null : client.id)}
                        >
                          {isOpen ? <><ChevronUp className="h-3 w-3" /> Hide intake</> : <><ChevronDown className="h-3 w-3" /> View intake</>}
                        </Button>
                      )}
                    </div>
                  </div>

                  {ob && isOpen && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-muted-foreground">Industry: </span><span className="text-foreground">{ob.industry || "—"}</span></div>
                        <div><span className="text-muted-foreground">Team: </span><span className="text-foreground">{ob.team_size || "—"}</span></div>
                        <div><span className="text-muted-foreground">Package: </span><span className="text-foreground">{ob.package_interest || "—"}</span></div>
                        <div><span className="text-muted-foreground">Budget: </span><span className="text-foreground">{ob.budget_range || "—"}</span></div>
                        <div><span className="text-muted-foreground">Timeline: </span><span className="text-foreground">{ob.timeline || "—"}</span></div>
                        <div><span className="text-muted-foreground">Timezone: </span><span className="text-foreground">{ob.timezone || "—"}</span></div>
                      </div>
                      {ob.primary_goal && <div><span className="text-muted-foreground">Goal: </span><span className="text-foreground">{ob.primary_goal}</span></div>}
                      {ob.pain_points && <div><span className="text-muted-foreground">Pain points: </span><span className="text-foreground">{ob.pain_points}</span></div>}
                      {ob.project_summary && <div><span className="text-muted-foreground">Summary: </span><span className="text-foreground">{ob.project_summary}</span></div>}
                      {ob.existing_tools && <div><span className="text-muted-foreground">Tools: </span><span className="text-foreground">{ob.existing_tools}</span></div>}

                      {ob.preferred_slots && ob.preferred_slots.length > 0 && (
                        <div>
                          <p className="text-muted-foreground mb-1.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Proposed call slots</p>
                          <div className="space-y-1.5">
                            {ob.preferred_slots.map((slot) => {
                              const isConfirmed = ob.confirmed_call_at && new Date(slot).toISOString() === ob.confirmed_call_at;
                              return (
                                <div key={slot} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5">
                                  <span className="text-foreground">{formatSlot(slot)}</span>
                                  {isConfirmed ? (
                                    <Badge className="bg-primary/30 text-primary text-[10px]">Confirmed</Badge>
                                  ) : (
                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                                      disabled={confirming === ob.id}
                                      onClick={() => confirmSlot(ob, slot)}>
                                      Confirm
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {ob.confirmed_call_at && (
                            <p className="text-xs text-primary mt-2">
                              ✓ Confirmed: {new Date(ob.confirmed_call_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminClients;
