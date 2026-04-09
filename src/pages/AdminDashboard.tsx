import { useEffect, useState, useCallback } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LogOut, ArrowLeft, Send, Loader2, Users, FolderOpen,
  MessageSquare, Clock, DollarSign, CheckCircle, Plus, Trash2, BarChart3
} from "lucide-react";

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
  client_id: string;
}

interface Profile {
  id: string;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  sort_order: number;
  project_id: string;
}

interface Message {
  id: string;
  content: string;
  is_from_client: boolean;
  created_at: string;
  sender_id: string;
}

const PROJECT_STATUSES: ProjectStatus[] = ["pending", "quoted", "accepted", "in_progress", "review", "delivered", "completed"];
const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "partial", "paid"];

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

const AdminDashboard = () => {
  const { user, signOut, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Milestone form
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && user && !isAdmin) navigate("/dashboard");
  }, [user, authLoading, isAdmin, navigate]);

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    const projectList = (data as Project[]) || [];
    setProjects(projectList);
    setLoadingProjects(false);

    // Fetch all client profiles
    const clientIds = [...new Set(projectList.map((p) => p.client_id))];
    if (clientIds.length > 0) {
      const { data: profileData } = await supabase.from("profiles").select("*").in("id", clientIds);
      const profileMap: Record<string, Profile> = {};
      (profileData || []).forEach((p: any) => { profileMap[p.id] = p; });
      setProfiles(profileMap);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) fetchProjects();
  }, [user, isAdmin, fetchProjects]);

  useEffect(() => {
    if (selectedProject) {
      fetchMilestones(selectedProject.id);
      fetchMessages(selectedProject.id);

      const channel = supabase
        .channel(`admin-messages-${selectedProject.id}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "project_messages",
          filter: `project_id=eq.${selectedProject.id}`,
        }, (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedProject]);

  const fetchMilestones = async (projectId: string) => {
    const { data } = await supabase.from("milestones").select("*").eq("project_id", projectId).order("sort_order");
    setMilestones((data as Milestone[]) || []);
  };

  const fetchMessages = async (projectId: string) => {
    const { data } = await supabase.from("project_messages").select("*").eq("project_id", projectId).order("created_at");
    setMessages((data as Message[]) || []);
  };

  const updateProject = async (field: keyof Project, value: any) => {
    if (!selectedProject) return;
    const updateData: Record<string, any> = { [field]: value, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("projects").update(updateData as any).eq("id", selectedProject.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSelectedProject({ ...selectedProject, [field]: value } as Project);
      setProjects((prev) => prev.map((p) => p.id === selectedProject.id ? { ...p, [field]: value } : p));
      toast({ title: "Updated!" });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedProject) return;
    const { error } = await supabase.from("project_messages").insert({
      project_id: selectedProject.id,
      sender_id: user!.id,
      content: newMessage,
      is_from_client: false,
    });
    if (error) toast({ title: "Error sending message", variant: "destructive" });
    setNewMessage("");
  };

  const addMilestone = async () => {
    if (!newMilestoneTitle.trim() || !selectedProject) return;
    const { error } = await supabase.from("milestones").insert({
      project_id: selectedProject.id,
      title: newMilestoneTitle,
      description: newMilestoneDesc || null,
      due_date: newMilestoneDue || null,
      sort_order: milestones.length,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setNewMilestoneTitle("");
      setNewMilestoneDesc("");
      setNewMilestoneDue("");
      setMilestoneDialogOpen(false);
      fetchMilestones(selectedProject.id);
      toast({ title: "Milestone added!" });
    }
  };

  const toggleMilestone = async (milestone: Milestone) => {
    const { error } = await supabase.from("milestones").update({
      is_completed: !milestone.is_completed,
      completed_at: !milestone.is_completed ? new Date().toISOString() : null,
    }).eq("id", milestone.id);
    if (!error) fetchMilestones(selectedProject!.id);
  };

  const deleteMilestone = async (id: string) => {
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (!error) fetchMilestones(selectedProject!.id);
  };

  if (authLoading || (!isAdmin && user)) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const stats = {
    total: projects.length,
    active: projects.filter((p) => ["in_progress", "review"].includes(p.status)).length,
    pending: projects.filter((p) => p.status === "pending").length,
    revenue: projects.reduce((sum, p) => sum + (p.paid_amount || 0), 0),
  };

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
                {selectedProject ? selectedProject.title : "Admin Dashboard"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {selectedProject
                  ? `Client: ${profiles[selectedProject.client_id]?.full_name || "Unknown"}`
                  : "Manage all client projects"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/contracts">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground font-display">
                Contracts
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!selectedProject ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Projects", value: stats.total, icon: FolderOpen },
                { label: "Active", value: stats.active, icon: BarChart3 },
                { label: "Pending", value: stats.pending, icon: Clock },
                { label: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign },
              ].map((stat) => (
                <Card key={stat.label} className="glass-card neon-border">
                  <CardContent className="p-4 flex items-center gap-3">
                    <stat.icon className="h-8 w-8 text-primary/60" />
                    <div>
                      <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Project List */}
            {loadingProjects ? (
              <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
            ) : projects.length === 0 ? (
              <div className="text-center py-16">
                <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-display">No projects yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {projects.map((project, i) => (
                  <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="glass-card neon-border neon-border-hover cursor-pointer transition-all" onClick={() => setSelectedProject(project)}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-display text-base font-semibold text-foreground">{project.title}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {profiles[project.client_id]?.full_name || "Unknown Client"}
                              {profiles[project.client_id]?.company_name && ` — ${profiles[project.client_id].company_name}`}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{project.description}</p>
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
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{new Date(project.created_at).toLocaleDateString()}</span>
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
          </>
        ) : (
          /* Project Detail View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Overview + Editable Fields */}
              <Card className="glass-card neon-border">
                <CardHeader><CardTitle className="font-display text-base">Project Management</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-sm">{selectedProject.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Status</label>
                      <Select value={selectedProject.status} onValueChange={(v) => updateProject("status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROJECT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Payment Status</label>
                      <Select value={selectedProject.payment_status} onValueChange={(v) => updateProject("payment_status", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Progress</label>
                      <Input
                        type="number" min={0} max={100}
                        value={selectedProject.progress}
                        onChange={(e) => updateProject("progress", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Quoted Amount ($)</label>
                      <Input
                        type="number" min={0}
                        value={selectedProject.quoted_amount}
                        onChange={(e) => updateProject("quoted_amount", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Paid Amount ($)</label>
                      <Input
                        type="number" min={0}
                        value={selectedProject.paid_amount}
                        onChange={(e) => updateProject("paid_amount", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Timeline</label>
                      <Input
                        value={selectedProject.estimated_timeline}
                        onChange={(e) => updateProject("estimated_timeline", e.target.value)}
                        placeholder="e.g. 6-8 weeks"
                      />
                    </div>
                  </div>

                  {/* Client Info */}
                  {profiles[selectedProject.client_id] && (
                    <div className="border-t border-border pt-4 mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Client Information</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Name</p>
                          <p className="text-foreground font-medium">{profiles[selectedProject.client_id].full_name}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Company</p>
                          <p className="text-foreground">{profiles[selectedProject.client_id].company_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Phone</p>
                          <p className="text-foreground">{profiles[selectedProject.client_id].phone || "—"}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Milestones */}
              <Card className="glass-card neon-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-display text-base">Milestones</CardTitle>
                  <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1 text-xs font-display">
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle className="font-display">Add Milestone</DialogTitle></DialogHeader>
                      <div className="space-y-3 mt-4">
                        <Input placeholder="Milestone title" value={newMilestoneTitle} onChange={(e) => setNewMilestoneTitle(e.target.value)} />
                        <Textarea placeholder="Description (optional)" value={newMilestoneDesc} onChange={(e) => setNewMilestoneDesc(e.target.value)} />
                        <Input type="date" value={newMilestoneDue} onChange={(e) => setNewMilestoneDue(e.target.value)} />
                        <Button onClick={addMilestone} className="w-full font-display text-sm">Add Milestone</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No milestones yet. Add the first one above.</p>
                  ) : (
                    <div className="space-y-3">
                      {milestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 group">
                          <button onClick={() => toggleMilestone(m)} className="flex-shrink-0">
                            <CheckCircle className={`h-5 w-5 transition-colors ${m.is_completed ? "text-primary" : "text-border hover:text-muted-foreground"}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${m.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{m.title}</p>
                            {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                          </div>
                          {m.due_date && <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(m.due_date).toLocaleDateString()}</span>}
                          <button onClick={() => deleteMilestone(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
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
                    <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className={`flex ${m.is_from_client ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.is_from_client ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}>
                          <p className="text-[10px] opacity-60 mb-0.5">{m.is_from_client ? "Client" : "You"}</p>
                          {m.content}
                          <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Reply to client..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
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

export default AdminDashboard;
