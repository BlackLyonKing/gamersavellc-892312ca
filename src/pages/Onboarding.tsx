import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Target, Sparkles, CalendarClock, ChevronLeft, ChevronRight,
  Loader2, CheckCircle2, Plus, X, CalendarIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingForm {
  // Step 1
  company_name: string;
  industry: string;
  team_size: string;
  website: string;
  // Step 2
  primary_goal: string;
  pain_points: string;
  existing_tools: string;
  // Step 3
  package_interest: string;
  budget_range: string;
  timeline: string;
  project_summary: string;
  // Step 4
  preferred_slots: string[];
  timezone: string;
}

const TOTAL_STEPS = 4;

const STEPS = [
  { num: 1, title: "Your Company", icon: Building2, desc: "Tell us who you are" },
  { num: 2, title: "Your Goals", icon: Target, desc: "What problems are we solving?" },
  { num: 3, title: "Project Scope", icon: Sparkles, desc: "What you want to build" },
  { num: 4, title: "Discovery Call", icon: CalendarClock, desc: "Pick a few times that work" },
];

const empty: OnboardingForm = {
  company_name: "", industry: "", team_size: "", website: "",
  primary_goal: "", pain_points: "", existing_tools: "",
  package_interest: "", budget_range: "", timeline: "", project_summary: "",
  preferred_slots: [], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
};

const Onboarding = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OnboardingForm>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [pickDate, setPickDate] = useState<Date | undefined>();
  const [pickTime, setPickTime] = useState<string>("10:00");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("client_onboarding")
        .select("*")
        .eq("client_id", user.id)
        .maybeSingle();
      if (data) {
        setRecordId(data.id);
        setStep(data.current_step || 1);
        setForm({
          company_name: data.company_name || "",
          industry: data.industry || "",
          team_size: data.team_size || "",
          website: data.website || "",
          primary_goal: data.primary_goal || "",
          pain_points: data.pain_points || "",
          existing_tools: data.existing_tools || "",
          package_interest: data.package_interest || "",
          budget_range: data.budget_range || "",
          timeline: data.timeline || "",
          project_summary: data.project_summary || "",
          preferred_slots: Array.isArray(data.preferred_slots) ? (data.preferred_slots as string[]) : [],
          timezone: data.timezone || empty.timezone,
        });
        if (data.status === "submitted" || data.status === "call_scheduled" || data.status === "completed") {
          navigate("/dashboard");
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const upsert = async (patch: Partial<OnboardingForm> & { current_step?: number; status?: string; submitted_at?: string }) => {
    if (!user) return null;
    const payload = { ...form, ...patch, client_id: user.id };
    if (recordId) {
      const { error } = await supabase.from("client_onboarding").update(payload).eq("id", recordId);
      if (error) throw error;
      return recordId;
    }
    const { data, error } = await supabase
      .from("client_onboarding")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    setRecordId(data.id);
    return data.id;
  };

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!form.company_name.trim()) return "Company name is required";
      if (!form.industry.trim()) return "Industry is required";
      if (!form.team_size) return "Team size is required";
    }
    if (step === 2) {
      if (form.primary_goal.trim().length < 10) return "Please describe your primary goal (at least 10 characters)";
      if (form.pain_points.trim().length < 10) return "Please describe your pain points (at least 10 characters)";
    }
    if (step === 3) {
      if (!form.package_interest) return "Pick a package you're interested in";
      if (!form.budget_range) return "Pick a budget range";
      if (!form.timeline) return "Pick a timeline";
      if (form.project_summary.trim().length < 20) return "Please write a brief project summary (at least 20 characters)";
    }
    if (step === 4) {
      if (form.preferred_slots.length < 2) return "Please propose at least 2 time slots";
    }
    return null;
  };

  const next = async () => {
    const err = validateStep();
    if (err) { toast({ title: "Almost there", description: err, variant: "destructive" }); return; }
    setSaving(true);
    try {
      const nextStep = Math.min(step + 1, TOTAL_STEPS);
      await upsert({ current_step: nextStep, status: "in_progress" });
      setStep(nextStep);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const back = () => setStep(Math.max(step - 1, 1));

  const submit = async () => {
    const err = validateStep();
    if (err) { toast({ title: "Almost there", description: err, variant: "destructive" }); return; }
    setSaving(true);
    try {
      await upsert({ current_step: TOTAL_STEPS, status: "submitted", submitted_at: new Date().toISOString() });
      // Fire-and-forget admin notification (don't block UX on email failures)
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user!.id)
          .maybeSingle();
        await supabase.functions.invoke("notify-admins-onboarding", {
          body: {
            client_name: profile?.full_name || user!.email,
            client_email: user!.email,
            company_name: form.company_name,
            industry: form.industry,
            package_interest: form.package_interest,
            budget_range: form.budget_range,
            timeline: form.timeline,
            primary_goal: form.primary_goal,
            pain_points: form.pain_points,
            project_summary: form.project_summary,
            preferred_slots: form.preferred_slots,
            timezone: form.timezone,
          },
        });
      } catch (notifyErr) {
        console.warn("Admin notification failed (non-blocking):", notifyErr);
      }
      toast({ title: "Onboarding submitted!", description: "Our team will review and confirm your discovery call shortly." });
      navigate("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const addSlot = () => {
    if (!pickDate) {
      toast({ title: "Pick a date first", variant: "destructive" });
      return;
    }
    const [hh, mm] = pickTime.split(":").map(Number);
    const dt = new Date(pickDate);
    dt.setHours(hh || 0, mm || 0, 0, 0);
    if (dt.getTime() < Date.now()) {
      toast({ title: "Pick a future time", variant: "destructive" });
      return;
    }
    const iso = dt.toISOString();
    if (form.preferred_slots.includes(iso)) return;
    if (form.preferred_slots.length >= 5) {
      toast({ title: "Max 5 slots", variant: "destructive" });
      return;
    }
    setForm({ ...form, preferred_slots: [...form.preferred_slots, iso] });
    setPickDate(undefined);
  };

  const removeSlot = (s: string) =>
    setForm({ ...form, preferred_slots: form.preferred_slots.filter((x) => x !== s) });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressPct = (step / TOTAL_STEPS) * 100;
  const Icon = STEPS[step - 1].icon;

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
      <div className="max-w-3xl mx-auto px-6 py-12 relative">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-primary font-display text-xs tracking-[0.3em] uppercase mb-3">
            Welcome to Gamers Ave
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Let's get you <span className="gradient-text">onboarded</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            4 quick steps so our team can hit the ground running on your call.
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s) => (
              <div key={s.num} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  step > s.num ? "bg-primary border-primary text-primary-foreground" :
                  step === s.num ? "border-primary text-primary bg-primary/10" :
                  "border-border text-muted-foreground"
                }`}>
                  {step > s.num ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                </div>
                <span className={`mt-2 text-[10px] font-display tracking-wider uppercase hidden sm:block ${
                  step >= s.num ? "text-foreground" : "text-muted-foreground"
                }`}>{s.title}</span>
              </div>
            ))}
          </div>
          <Progress value={progressPct} className="h-1" />
        </div>

        {/* Card */}
        <Card className="glass-card neon-border">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold">{STEPS[step - 1].title}</h2>
                <p className="text-xs text-muted-foreground">{STEPS[step - 1].desc}</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {step === 1 && (
                  <>
                    <div>
                      <Label htmlFor="company">Company name *</Label>
                      <Input id="company" maxLength={120} value={form.company_name}
                        onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="industry">Industry *</Label>
                      <Input id="industry" maxLength={80} placeholder="e.g. SaaS, e-commerce, healthcare"
                        value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                    </div>
                    <div>
                      <Label>Team size *</Label>
                      <Select value={form.team_size} onValueChange={(v) => setForm({ ...form, team_size: v })}>
                        <SelectTrigger><SelectValue placeholder="Select team size" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solo">Just me</SelectItem>
                          <SelectItem value="2-10">2 – 10</SelectItem>
                          <SelectItem value="11-50">11 – 50</SelectItem>
                          <SelectItem value="51-200">51 – 200</SelectItem>
                          <SelectItem value="200+">200+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="website">Website (optional)</Label>
                      <Input id="website" maxLength={200} placeholder="https://..." value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })} />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div>
                      <Label htmlFor="goal">Primary goal *</Label>
                      <Textarea id="goal" maxLength={500} placeholder="What outcome do you want from working with us?"
                        className="min-h-[90px]" value={form.primary_goal}
                        onChange={(e) => setForm({ ...form, primary_goal: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="pain">Pain points *</Label>
                      <Textarea id="pain" maxLength={500} placeholder="What's broken, slow, or manual right now?"
                        className="min-h-[90px]" value={form.pain_points}
                        onChange={(e) => setForm({ ...form, pain_points: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="tools">Existing tools / stack (optional)</Label>
                      <Textarea id="tools" maxLength={400} placeholder="e.g. HubSpot, Notion, Shopify, Zapier..."
                        className="min-h-[70px]" value={form.existing_tools}
                        onChange={(e) => setForm({ ...form, existing_tools: e.target.value })} />
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div>
                      <Label>Package interest *</Label>
                      <Select value={form.package_interest} onValueChange={(v) => setForm({ ...form, package_interest: v })}>
                        <SelectTrigger><SelectValue placeholder="Pick a starting point" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="discovery">Discovery (1 wk · from $750)</SelectItem>
                          <SelectItem value="audit">Workflow Audit (1–2 wks · from $1,800)</SelectItem>
                          <SelectItem value="prototype">Prototype (2–4 wks · from $3,500)</SelectItem>
                          <SelectItem value="rollout">Full Rollout (4–8 wks · from $7,500)</SelectItem>
                          <SelectItem value="custom_build">Custom build (web / Web3 / AI)</SelectItem>
                          <SelectItem value="not_sure">Not sure yet — help me decide</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Budget range *</Label>
                      <Select value={form.budget_range} onValueChange={(v) => setForm({ ...form, budget_range: v })}>
                        <SelectTrigger><SelectValue placeholder="Select budget" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<2k">Under $2k</SelectItem>
                          <SelectItem value="2k-5k">$2k – $5k</SelectItem>
                          <SelectItem value="5k-15k">$5k – $15k</SelectItem>
                          <SelectItem value="15k-50k">$15k – $50k</SelectItem>
                          <SelectItem value="50k+">$50k+</SelectItem>
                          <SelectItem value="open">Open / depends on scope</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Timeline *</Label>
                      <Select value={form.timeline} onValueChange={(v) => setForm({ ...form, timeline: v })}>
                        <SelectTrigger><SelectValue placeholder="When do you need this?" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asap">ASAP (within 2 weeks)</SelectItem>
                          <SelectItem value="1-2mo">1 – 2 months</SelectItem>
                          <SelectItem value="3-6mo">3 – 6 months</SelectItem>
                          <SelectItem value="exploring">Just exploring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="summary">Project summary *</Label>
                      <Textarea id="summary" maxLength={1000} placeholder="In a few sentences — what should we build?"
                        className="min-h-[110px]" value={form.project_summary}
                        onChange={(e) => setForm({ ...form, project_summary: e.target.value })} />
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <div>
                      <Label htmlFor="tz">Your timezone</Label>
                      <Input id="tz" maxLength={80} value={form.timezone}
                        onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
                    </div>
                    <div>
                      <Label>Propose 2–5 time slots that work *</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Pick a date and time — our team will confirm one slot.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn("flex-1 justify-start text-left font-normal", !pickDate && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {pickDate ? format(pickDate, "EEE, MMM d, yyyy") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={pickDate}
                              onSelect={setPickDate}
                              disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          value={pickTime}
                          onChange={(e) => setPickTime(e.target.value)}
                          className="sm:w-32"
                        />
                        <Button type="button" variant="secondary" onClick={addSlot} className="gap-1">
                          <Plus className="h-4 w-4" /> Add
                        </Button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {form.preferred_slots.map((s) => (
                          <div key={s} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2 text-sm">
                            <span>{format(new Date(s), "EEE, MMM d, yyyy 'at' h:mm a")}</span>
                            <button onClick={() => removeSlot(s)} className="text-muted-foreground hover:text-destructive">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {form.preferred_slots.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No slots added yet.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button variant="ghost" onClick={back} disabled={step === 1 || saving} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              {step < TOTAL_STEPS ? (
                <Button onClick={next} disabled={saving} className="gap-2 font-display text-xs tracking-wider uppercase">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ChevronRight className="h-4 w-4" /></>}
                </Button>
              ) : (
                <Button onClick={submit} disabled={saving} className="gap-2 font-display text-xs tracking-wider uppercase">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit Onboarding <CheckCircle2 className="h-4 w-4" /></>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your progress is saved automatically as you advance.
        </p>
      </div>
    </div>
  );
};

export default Onboarding;