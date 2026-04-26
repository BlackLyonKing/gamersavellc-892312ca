import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut, Plus, FolderOpen, MessageSquare, Clock, DollarSign, ArrowLeft,
  Send, Loader2, FileText, Receipt, User, CheckCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import OnboardingRoadmap, { type OnboardingStatus } from "@/components/OnboardingRoadmap";

type ProjectStatus = "pending" | "quoted" | "accepted" | "in_progress" | "review" | "delivered" | "completed";
type PaymentStatus = "unpaid" | "partial" | "paid";

interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  payment_status: PaymentStatus;
  quoted_amount: number;
  paid_amount: number;
  progress: number;
  tech_stack: string[];
  estimated_timeline: string;
  created_at: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  is_completed: boolean;
  due_date: string | null;
  sort_order: number;
}

interface Message {
  id: string;
  content: string;
  is_from_client: boolean;
  created_at: string;
}

interface ContractRecord {
  id: string;
  contract_number: string;
  title: string;
  scope_summary: string;
  total_amount: number;
  recurring_monthly: number;
  status: string;
  created_at: string;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  amount: number;
  description: string;
  due_date: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface ProfileData {
  full_name: string;
  company_name: string | null;
  phone: string | null;
}

const statusColors: Record<ProjectStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  quoted: "bg-accent/20 text-accent",
  accepted: "bg-primary/20 text-primary",
  in_progress: "bg-primary/30 text-primary",
  review: "bg-accent/30 text-accent",
  delivered: "bg-primary/40 text-primary",
  completed: "bg-primary text-primary-foreground",
};

const paymentColors: Record<PaymentStatus, string> = {
  unpaid: "bg-destructive/20 text-destructive",
  partial: "bg-accent/20 text-accent",
  paid: "bg-primary/20 text-primary",
};

const contractStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent/20 text-accent",
  signed: "bg-primary/20 text-primary",
  expired: "bg-destructive/20 text-destructive",
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent/20 text-accent",
  paid: "bg-primary/20 text-primary",
  overdue: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const Dashboard = () => {
  const { user, signOut, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeTab, setActiveTab] = useState("projects");

  // Contracts & Invoices
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // Profile
  const [profile, setProfile] = useState<ProfileData>({ full_name: "", company_name: null, phone: null });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileData>({ full_name: "", company_name: null, phone: null });
  const [savingProfile, setSavingProfile] = useState(false);

  // Onboarding
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [confirmedCallAt, setConfirmedCallAt] = useState<string | null>(null);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchContracts();
      fetchInvoices();
      fetchProfile();
      fetchOnboarding();
    }
  }, [user, isAdmin]);

  const fetchOnboarding = async () => {
    if (!user || isAdmin) { setOnboardingChecked(true); return; }
    const { data } = await supabase
      .from("client_onboarding")
      .select("status, confirmed_call_at")
      .eq("client_id", user.id)
      .maybeSingle();
    if (!data) {
      // Brand new client — send to onboarding
      navigate("/onboarding");
      return;
    }
    if (data.status === "in_progress") {
      navigate("/onboarding");
      return;
    }
    setOnboardingStatus(data.status as OnboardingStatus);
    setConfirmedCallAt(data.confirmed_call_at);
    setOnboardingChecked(true);
  };

  useEffect(() => {
    if (selectedProject) {
      fetchMilestones(selectedProject.id);
      fetchMessages(selectedProject.id);

      const channel = supabase
        .channel(`messages-${selectedProject.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "project_messages", filter: `project_id=eq.${selectedProject.id}` }, (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    setProjects((data as Project[]) || []);
    setLoadingProjects(false);
  };

  const fetchContracts = async () => {
    const { data } = await supabase.from("contracts").select("*").order("created_at", { ascending: false });
    setContracts((data as ContractRecord[]) || []);
    setLoadingContracts(false);
  };

  const fetchInvoices = async () => {
    const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
    setInvoices((data as InvoiceRecord[]) || []);
    setLoadingInvoices(false);
  };

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("full_name, company_name, phone").eq("id", user.id).maybeSingle();
    if (data) {
      setProfile(data as ProfileData);
      setProfileForm(data as ProfileData);
    }
  };

  const fetchMilestones = async (projectId: string) => {
    const { data } = await supabase.from("milestones").select("*").eq("project_id", projectId).order("sort_order");
    setMilestones((data as Milestone[]) || []);
  };

  const fetchMessages = async (projectId: string) => {
    const { data } = await supabase.from("project_messages").select("*").eq("project_id", projectId).order("created_at");
    setMessages((data as Message[]) || []);
  };

  const submitProject = async () => {
    if (!newProjectTitle.trim() || !newProjectDesc.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("projects").insert({
      client_id: user!.id,
      title: newProjectTitle,
      description: newProjectDesc,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Project submitted!" });
      setNewProjectTitle("");
      setNewProjectDesc("");
      setDialogOpen(false);
      fetchProjects();
    }
    setSubmitting(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedProject) return;
    const { error } = await supabase.from("project_messages").insert({
      project_id: selectedProject.id,
      sender_id: user!.id,
      content: newMessage,
      is_from_client: true,
    });
    if (error) toast({ title: "Error sending message", variant: "destructive" });
    setNewMessage("");
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profileForm.full_name,
      company_name: profileForm.company_name,
      phone: profileForm.phone,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProfile(profileForm);
      setEditingProfile(false);
      toast({ title: "Profile updated!" });
    }
    setSavingProfile(false);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedProject ? (
              <Button variant="ghost" size="icon" onClick={() => setSelectedProject(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
            )}
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">
                {selectedProject ? selectedProject.title : "Client Portal"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedProject ? `Status: ${selectedProject.status.replace("_", " ")}` : `Welcome, ${profile.full_name || user?.email}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!selectedProject && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 font-display text-xs tracking-wider uppercase">
                    <Plus className="h-4 w-4" /> New Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">Submit a New Project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <Input placeholder="Project title" value={newProjectTitle} onChange={(e) => setNewProjectTitle(e.target.value)} />
                    <Textarea placeholder="Describe what you need built..." value={newProjectDesc} onChange={(e) => setNewProjectDesc(e.target.value)} className="min-h-[120px]" />
                    <Button onClick={submitProject} disabled={submitting} className="w-full font-display text-sm tracking-wider uppercase">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Project"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!selectedProject ? (
          <>
          {!isAdmin && onboardingStatus && onboardingStatus !== "completed" && (
            <OnboardingRoadmap status={onboardingStatus} confirmedCallAt={confirmedCallAt} />
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="projects" className="gap-2 font-display text-xs">
                <FolderOpen className="h-3.5 w-3.5" /> Projects
              </TabsTrigger>
              <TabsTrigger value="contracts" className="gap-2 font-display text-xs">
                <FileText className="h-3.5 w-3.5" /> Contracts
              </TabsTrigger>
              <TabsTrigger value="invoices" className="gap-2 font-display text-xs">
                <Receipt className="h-3.5 w-3.5" /> Invoices
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2 font-display text-xs">
                <User className="h-3.5 w-3.5" /> Profile
              </TabsTrigger>
            </TabsList>

            {/* Projects Tab */}
            <TabsContent value="projects">
              {loadingProjects ? (
                <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
              ) : projects.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                  <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-display">No projects yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Click "New Project" to get started</p>
                </motion.div>
              ) : (
                <div className="grid gap-4">
                  {projects.map((project, i) => (
                    <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="glass-card neon-border neon-border-hover cursor-pointer transition-all" onClick={() => setSelectedProject(project)}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-display text-base font-semibold text-foreground">{project.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Badge className={statusColors[project.status]}>{project.status.replace("_", " ")}</Badge>
                              <Badge className={paymentColors[project.payment_status]}>{project.payment_status}</Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            {project.quoted_amount > 0 && (
                              <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />${project.quoted_amount.toLocaleString()}</span>
                            )}
                            {project.estimated_timeline && (
                              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{project.estimated_timeline}</span>
                            )}
                            <div className="flex-1" />
                            <div className="flex items-center gap-2 w-32">
                              <Progress value={project.progress} className="h-2" />
                              <span className="text-xs">{project.progress}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Contracts Tab */}
            <TabsContent value="contracts">
              {loadingContracts ? (
                <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-display">No contracts yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Contracts will appear here once your project is scoped</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {contracts.map((contract, i) => (
                    <motion.div key={contract.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="glass-card neon-border">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-display text-sm font-semibold text-foreground">{contract.title}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">#{contract.contract_number}</p>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{contract.scope_summary}</p>
                            </div>
                            <Badge className={contractStatusColors[contract.status]}>{contract.status}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                            <span className="font-display font-semibold text-foreground">${contract.total_amount.toLocaleString()}</span>
                            {contract.recurring_monthly > 0 && (
                              <span className="text-accent">+ ${contract.recurring_monthly.toLocaleString()}/mo</span>
                            )}
                            <div className="flex-1" />
                            <span className="text-xs">{new Date(contract.created_at).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
              {loadingInvoices ? (
                <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-16">
                  <Receipt className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-display">No invoices yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Invoices will appear here when issued</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {invoices.map((inv, i) => (
                    <motion.div key={inv.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="glass-card neon-border">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-display text-sm font-semibold text-foreground">#{inv.invoice_number}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{inv.description}</p>
                            </div>
                            <Badge className={invoiceStatusColors[inv.status]}>{inv.status}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                            <span className="font-display font-semibold text-foreground flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />${inv.amount.toLocaleString()}
                            </span>
                            {inv.due_date && <span>Due: {new Date(inv.due_date).toLocaleDateString()}</span>}
                            {inv.paid_at && <span className="text-primary">Paid: {new Date(inv.paid_at).toLocaleDateString()}</span>}
                            <div className="flex-1" />
                            <span className="text-xs">{new Date(inv.created_at).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card className="glass-card neon-border max-w-lg">
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <User className="h-4 w-4" /> Your Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingProfile ? (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Full Name</label>
                        <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Company</label>
                        <Input value={profileForm.company_name || ""} onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value || null })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Phone</label>
                        <Input value={profileForm.phone || ""} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value || null })} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={saveProfile} disabled={savingProfile} className="flex-1 font-display text-sm">
                          {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                        <Button variant="outline" onClick={() => { setEditingProfile(false); setProfileForm(profile); }}>Cancel</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p className="text-sm text-foreground font-medium">{profile.full_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Company</p>
                          <p className="text-sm text-foreground">{profile.company_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm text-foreground">{profile.phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm text-foreground">{user?.email}</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setEditingProfile(true)} className="font-display text-sm">
                        Edit Profile
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          /* Project Detail View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Overview */}
              <Card className="glass-card neon-border">
                <CardHeader><CardTitle className="font-display text-base">Project Overview</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">{selectedProject.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className={`mt-1 ${statusColors[selectedProject.status]}`}>{selectedProject.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Payment</p>
                      <Badge className={`mt-1 ${paymentColors[selectedProject.payment_status]}`}>{selectedProject.payment_status}</Badge>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Quote</p>
                      <p className="font-display font-bold text-foreground">${selectedProject.quoted_amount.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Progress</p>
                      <Progress value={selectedProject.progress} className="h-2 mt-2" />
                      <p className="text-xs mt-1 text-foreground">{selectedProject.progress}%</p>
                    </div>
                  </div>
                  {selectedProject.tech_stack?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedProject.tech_stack.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Milestones */}
              <Card className="glass-card neon-border">
                <CardHeader><CardTitle className="font-display text-base">Milestones</CardTitle></CardHeader>
                <CardContent>
                  {milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No milestones added yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {milestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <CheckCircle className={`h-5 w-5 flex-shrink-0 ${m.is_completed ? "text-primary" : "text-border"}`} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${m.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{m.title}</p>
                            {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                          </div>
                          {m.due_date && <span className="text-xs text-muted-foreground">{new Date(m.due_date).toLocaleDateString()}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Messages sidebar */}
            <Card className="glass-card neon-border lg:sticky lg:top-20 h-fit">
              <CardHeader>
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] overflow-y-auto space-y-3 mb-4 pr-2">
                  {messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Start the conversation!</p>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className={`flex ${m.is_from_client ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.is_from_client ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          {m.content}
                          <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
                  <Button size="icon" onClick={sendMessage}><Send className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
