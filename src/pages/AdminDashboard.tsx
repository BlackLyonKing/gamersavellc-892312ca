import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Send, Plus, Trash2, CheckCircle, MessageSquare,
  FolderOpen, FileText, Receipt, Users, Download, Shield, Palette, Pencil, Save, X, PieChart, Phone
} from "lucide-react";

import AdminHeader from "@/components/admin/AdminHeader";
import AdminStats from "@/components/admin/AdminStats";
import AdminProjectList from "@/components/admin/AdminProjectList";
import AdminInvoices from "@/components/admin/AdminInvoices";
import AdminClients from "@/components/admin/AdminClients";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminPortfolio from "@/components/admin/AdminPortfolio";
import AdminPaymentSplits from "@/components/admin/AdminPaymentSplits";
import AdminVapi from "@/components/admin/AdminVapi";
import type { Project, Profile, ProjectStatus, PaymentStatus } from "@/components/admin/AdminProjectList";
import { statusColors, paymentColors } from "@/components/admin/AdminProjectList";

const PROJECT_STATUSES: ProjectStatus[] = ["pending", "quoted", "accepted", "in_progress", "review", "delivered", "completed"];
const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "partial", "paid"];

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

interface NewProjectForm {
  client_id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  payment_status: PaymentStatus;
  quoted_amount: number;
  paid_amount: number;
  progress: number;
  estimated_timeline: string;
}

const EMPTY_NEW_PROJECT: NewProjectForm = {
  client_id: "",
  title: "",
  description: "",
  status: "pending",
  payment_status: "unpaid",
  quoted_amount: 0,
  paid_amount: 0,
  progress: 0,
  estimated_timeline: "",
};

const AdminDashboard = () => {
  const { user, signOut, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile & { phone?: string | null }>>({});
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeTab, setActiveTab] = useState("projects");
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [contractCount, setContractCount] = useState(0);

  // Milestone form
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");
  const [newMilestoneDue, setNewMilestoneDue] = useState("");
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState<NewProjectForm>(EMPTY_NEW_PROJECT);
  const [newProjectTech, setNewProjectTech] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && user && !isAdmin) navigate("/dashboard");
  }, [user, authLoading, isAdmin, navigate]);

  const fetchProjects = useCallback(async () => {
    const [{ data }, { data: profileData }] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("full_name"),
    ]);
    const projectList = (data as Project[]) || [];
    setProjects(projectList);
    setLoadingProjects(false);

    const profileMap: Record<string, Profile & { phone?: string | null }> = {};
    (profileData || []).forEach((p: any) => { profileMap[p.id] = p; });
    setProfiles(profileMap);
  }, []);

  const fetchCounts = useCallback(async () => {
    const [{ count: cCount }, { count: iCount }] = await Promise.all([
      supabase.from("contracts").select("*", { count: "exact", head: true }),
      supabase.from("invoices").select("*", { count: "exact", head: true }),
    ]);
    setContractCount(cCount || 0);
    setInvoiceCount(iCount || 0);
  }, []);

  useEffect(() => {
    if (user && isAdmin) {
      fetchProjects();
      fetchCounts();
    }
  }, [user, isAdmin, fetchProjects, fetchCounts]);

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

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProjects(prev => prev.filter(p => p.id !== id));
      setSelectedProject(null);
      toast({ title: "Project deleted" });
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

  const projectSummaries = Object.keys(profiles).map((clientId) => ({
    client_id: clientId,
    count: projects.filter((p) => p.client_id === clientId).length,
    totalPaid: projects.filter((p) => p.client_id === clientId).reduce((sum, p) => sum + (p.paid_amount || 0), 0),
  }));

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader
        title={selectedProject ? selectedProject.title : "Admin Dashboard"}
        subtitle={selectedProject
          ? `Client: ${profiles[selectedProject.client_id]?.full_name || "Unknown"}`
          : "Manage all projects, contracts, invoices & clients"}
        onSignOut={signOut}
        onBack={selectedProject ? () => setSelectedProject(null) : undefined}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!selectedProject ? (
          <>
            <AdminStats
              projectCount={stats.total}
              activeCount={stats.active}
              pendingCount={stats.pending}
              revenue={stats.revenue}
              contractCount={contractCount}
              invoiceCount={invoiceCount}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6 h-auto flex-wrap justify-start gap-1 p-1 w-full">
                <TabsTrigger value="projects" className="gap-1.5 font-display text-[11px] px-2.5 py-1.5">
                  <FolderOpen className="h-3.5 w-3.5" /> Projects
                </TabsTrigger>
                <TabsTrigger value="contracts" className="gap-1.5 font-display text-[11px] px-2.5 py-1.5">
                  <FileText className="h-3.5 w-3.5" /> Contracts
                </TabsTrigger>
                <TabsTrigger value="invoices" className="gap-1.5 font-display text-[11px] px-2.5 py-1.5">
                  <Receipt className="h-3.5 w-3.5" /> Invoices
                </TabsTrigger>
                <TabsTrigger value="clients" className="gap-1.5 font-display text-[11px] px-2.5 py-1.5">
                  <Users className="h-3.5 w-3.5" /> Clients
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-1.5 font-display text-[11px] px-2.5 py-1.5">
                  <Shield className="h-3.5 w-3.5" /> Users
                </TabsTrigger>
                <TabsTrigger value="portfolio" className="gap-1.5 font-display text-[11px] px-2.5 py-1.5">
                  <Palette className="h-3.5 w-3.5" /> Portfolio
                </TabsTrigger>
                <TabsTrigger value="splits" className="gap-1.5 font-display text-[11px] px-2.5 py-1.5">
                  <PieChart className="h-3.5 w-3.5" /> Splits
                </TabsTrigger>
                <TabsTrigger value="vapi" className="gap-1.5 font-display text-[11px] px-2.5 py-1.5">
                  <Phone className="h-3.5 w-3.5" /> Voice AI
                </TabsTrigger>
              </TabsList>

              <TabsContent value="projects">
                <AdminProjectList
                  projects={projects}
                  profiles={profiles}
                  loading={loadingProjects}
                  onSelectProject={setSelectedProject}
                />
              </TabsContent>

              <TabsContent value="contracts">
                <ContractsInline profiles={profiles} />
              </TabsContent>

              <TabsContent value="invoices">
                <AdminInvoices profiles={profiles} />
              </TabsContent>

              <TabsContent value="clients">
                <AdminClients
                  profiles={profiles}
                  projectSummaries={projectSummaries}
                  loading={loadingProjects}
                />
              </TabsContent>

              <TabsContent value="users">
                <AdminUserManagement />
              </TabsContent>

              <TabsContent value="portfolio">
                <AdminPortfolio />
              </TabsContent>

              <TabsContent value="splits">
                <AdminPaymentSplits profiles={profiles} />
              </TabsContent>

              <TabsContent value="vapi">
                <AdminVapi />
              </TabsContent>
            </Tabs>
          </>
        ) : (
          /* Project Detail View */
          <ProjectDetail
            project={selectedProject}
            profiles={profiles}
            milestones={milestones}
            messages={messages}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            onSendMessage={sendMessage}
            onUpdateProject={updateProject}
            onAddMilestone={addMilestone}
            onToggleMilestone={toggleMilestone}
            onDeleteMilestone={deleteMilestone}
            milestoneDialogOpen={milestoneDialogOpen}
            setMilestoneDialogOpen={setMilestoneDialogOpen}
            newMilestoneTitle={newMilestoneTitle}
            setNewMilestoneTitle={setNewMilestoneTitle}
            newMilestoneDesc={newMilestoneDesc}
            setNewMilestoneDesc={setNewMilestoneDesc}
            newMilestoneDue={newMilestoneDue}
            setNewMilestoneDue={setNewMilestoneDue}
            onDeleteProject={deleteProject}
          />
        )}
      </div>
    </div>
  );
};

/* ─── Inline Contracts Tab ─── */
import jsPDF from "jspdf";

interface ContractsInlineProps {
  profiles: Record<string, Profile>;
}

interface ContractRecord {
  id: string;
  contract_number: string;
  title: string;
  scope_summary: string;
  fee_breakdown: any;
  total_amount: number;
  recurring_monthly: number;
  terms_text: string;
  status: string;
  created_at: string;
  project_id: string | null;
  client_id: string;
}

interface ContractProject {
  id: string;
  title: string;
  description: string;
  quoted_amount: number | null;
  tech_stack: string[] | null;
  estimated_timeline: string | null;
  client_id: string;
}

interface FeeItem {
  category: string;
  type: "one_time" | "monthly" | "hourly" | "milestone";
  amount: number;
  description: string;
  hours?: number;
  rate?: number;
}

interface PaymentMilestone {
  milestone: string;
  percentage: number;
  amount: number;
  dueDate?: string;
}

interface GeneratedContract {
  contractTitle: string;
  effectiveDate: string;
  scopeSummary: string;
  feeBreakdown: FeeItem[];
  totalOneTime: number;
  totalMonthly: number;
  grandTotal: number;
  paymentSchedule: PaymentMilestone[];
  fullContractText: string;
  keyTerms: string[];
}

const feeTypeLabels: Record<string, string> = {
  one_time: "One-Time",
  monthly: "Monthly",
  hourly: "Hourly",
  milestone: "Milestone",
};

const contractStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent/20 text-accent",
  signed: "bg-primary/20 text-primary",
  expired: "bg-destructive/20 text-destructive",
};

const ContractsInline = ({ profiles }: ContractsInlineProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [contractProjects, setContractProjects] = useState<ContractProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null);

  // Inline editing state
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ title: "", scope_summary: "", terms_text: "", total_amount: 0, recurring_monthly: 0 });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchContracts = useCallback(async () => {
    const { data } = await supabase.from("contracts").select("*").order("created_at", { ascending: false });
    setContracts((data as ContractRecord[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContracts();
    supabase.from("projects").select("id, title, description, quoted_amount, tech_stack, estimated_timeline, client_id").order("created_at", { ascending: false }).then(({ data }) => {
      setContractProjects((data as ContractProject[]) || []);
    });
  }, [fetchContracts]);

  const updateStatus = async (id: string, status: string) => {
    const updateData: Record<string, any> = { status };
    if (status === "signed") updateData.signed_at = new Date().toISOString();
    const { error } = await supabase.from("contracts").update(updateData as any).eq("id", id);
    if (!error) {
      setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      toast({ title: `Contract marked as ${status}` });
    }
  };

  const startEditContract = (c: ContractRecord) => {
    setEditingContractId(c.id);
    setEditFields({ title: c.title, scope_summary: c.scope_summary, terms_text: c.terms_text, total_amount: c.total_amount, recurring_monthly: c.recurring_monthly });
  };

  const saveContractEdit = async () => {
    if (!editingContractId) return;
    setSavingEdit(true);
    const { error } = await supabase.from("contracts").update({
      title: editFields.title,
      scope_summary: editFields.scope_summary,
      terms_text: editFields.terms_text,
      total_amount: editFields.total_amount,
      recurring_monthly: editFields.recurring_monthly,
      updated_at: new Date().toISOString(),
    } as any).eq("id", editingContractId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else {
      setContracts((prev) => prev.map(c => c.id === editingContractId ? { ...c, ...editFields } : c));
      setEditingContractId(null);
      toast({ title: "Contract updated!" });
    }
    setSavingEdit(false);
  };

  const deleteContract = async (id: string) => {
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { setContracts(prev => prev.filter(c => c.id !== id)); toast({ title: "Contract deleted" }); }
  };

  const downloadContractPdf = useCallback((contract: ContractRecord) => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 50;
    const usable = pageWidth - margin * 2;
    let y = margin;

    const checkPage = (needed: number) => {
      if (y + needed > pageHeight - margin) { doc.addPage(); y = margin; }
    };

    // Header
    doc.setFillColor(10, 10, 26);
    doc.rect(0, 0, pageWidth, 80, "F");
    doc.setTextColor(200, 255, 230);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(contract.title, margin, 45);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 200, 180);
    doc.text(`#${contract.contract_number}`, margin, 62);
    doc.text(`Generated ${new Date(contract.created_at).toLocaleDateString()}`, pageWidth - margin, 62, { align: "right" });
    y = 110;

    // Summary
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("SCOPE SUMMARY", margin, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(contract.scope_summary, usable);
    checkPage(summaryLines.length * 14 + 10);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 14 + 20;

    // Fee breakdown
    const fees = (Array.isArray(contract.fee_breakdown) ? contract.fee_breakdown : []) as FeeItem[];
    if (fees.length > 0) {
      checkPage(40 + fees.length * 22);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("FEE BREAKDOWN", margin, y);
      y += 20;
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 12, usable, 18, "F");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("Category", margin + 6, y);
      doc.text("Type", margin + 220, y);
      doc.text("Amount", margin + usable - 10, y, { align: "right" });
      y += 14;
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      fees.forEach((fee) => {
        checkPage(20);
        doc.text(fee.category || "", margin + 6, y);
        doc.text(feeTypeLabels[fee.type] || fee.type, margin + 220, y);
        doc.text(`$${(fee.amount || 0).toLocaleString()}`, margin + usable - 10, y, { align: "right" });
        y += 18;
      });
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, margin + usable, y);
      y += 16;
      doc.setFont("helvetica", "bold");
      doc.text("Total", margin + 6, y);
      doc.text(`$${contract.total_amount.toLocaleString()}`, margin + usable - 10, y, { align: "right" });
      y += 16;
      if (contract.recurring_monthly > 0) {
        doc.text("Monthly Recurring", margin + 6, y);
        doc.text(`$${contract.recurring_monthly.toLocaleString()}/mo`, margin + usable - 10, y, { align: "right" });
        y += 16;
      }
      y += 16;
    }

    // Terms
    checkPage(30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text("TERMS & CONDITIONS", margin, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(contract.terms_text, usable);
    for (const line of lines) {
      checkPage(14);
      doc.text(line, margin, y);
      y += 13;
    }

    // Footer
    const footerY = pageHeight - 30;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${contract.contract_number} — Gamers Ave LLC`, margin, footerY);
    doc.text("Confidential", pageWidth - margin, footerY, { align: "right" });

    doc.save(`${contract.contract_number}-${contract.title.replace(/\s+/g, "-")}.pdf`);
  }, []);
  const generateContract = async () => {
    const project = contractProjects.find((p) => p.id === selectedProjectId);
    const title = project?.title || customTitle;
    const desc = project?.description || customDesc;

    if (!title.trim() || !desc.trim()) {
      toast({ title: "Please provide a project title and description", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const clientProfile = project ? profiles[project.client_id] : null;
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: {
          projectTitle: title,
          projectDescription: desc,
          clientName: clientProfile?.full_name || "",
          companyName: clientProfile?.company_name || "",
          quotedAmount: project?.quoted_amount || 0,
          techStack: project?.tech_stack || [],
          estimatedTimeline: project?.estimated_timeline || "",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedContract(data.contract);
      toast({ title: "Contract generated!" });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const saveContract = async () => {
    if (!generatedContract || !user) return;
    setSaving(true);
    const project = contractProjects.find((p) => p.id === selectedProjectId);
    const contractNumber = `GA-${Date.now().toString(36).toUpperCase()}`;
    const { data: insertedContract, error } = await supabase.from("contracts").insert({
      project_id: project?.id || null,
      client_id: project?.client_id || user.id,
      contract_number: contractNumber,
      title: generatedContract.contractTitle,
      scope_summary: generatedContract.scopeSummary,
      fee_breakdown: generatedContract.feeBreakdown as any,
      total_amount: generatedContract.grandTotal,
      recurring_monthly: generatedContract.totalMonthly,
      terms_text: generatedContract.fullContractText,
      status: "draft" as any,
    }).select("id, total_amount").single();
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      // Auto-create default company payment split (100%)
      if (insertedContract) {
        await supabase.from("payment_splits").insert({
          contract_id: insertedContract.id,
          recipient_type: "company",
          recipient_id: null,
          percentage: 100,
          amount: insertedContract.total_amount,
        } as any);
      }
      toast({ title: "Contract saved!" });
      setGeneratedContract(null);
      setDialogOpen(false);
      setSelectedProjectId("");
      setCustomTitle("");
      setCustomDesc("");
      fetchContracts();
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-base font-semibold text-foreground">All Contracts</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setGeneratedContract(null); setSelectedProjectId(""); setCustomTitle(""); setCustomDesc(""); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 font-display text-xs tracking-wider uppercase">
              <Plus className="h-4 w-4" /> Generate Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Generate Contract</DialogTitle>
            </DialogHeader>

            {!generatedContract ? (
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Link to existing project (optional)</label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger><SelectValue placeholder="Select a project..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No linked project</SelectItem>
                      {contractProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(!selectedProjectId || selectedProjectId === "none") && (
                  <>
                    <Input placeholder="Project title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                    <Textarea placeholder="Describe the project scope in detail..." value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} className="min-h-[120px]" />
                  </>
                )}

                <Button onClick={generateContract} disabled={generating} className="w-full font-display text-sm tracking-wider uppercase">
                  {generating ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</> : "Generate Contract"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6 mt-4">
                <div>
                  <h3 className="font-display text-base font-semibold text-foreground">{generatedContract.contractTitle}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{generatedContract.scopeSummary}</p>
                </div>

                <Card className="glass-card neon-border">
                  <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Fee Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {generatedContract.feeBreakdown.map((fee, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-foreground">{fee.category}</span>
                            <Badge variant="secondary" className="ml-2 text-[10px]">{feeTypeLabels[fee.type]}</Badge>
                          </div>
                          <span className="font-display font-semibold text-foreground">${fee.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border mt-4 pt-4 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">One-Time Total</span>
                        <span className="font-display font-bold text-foreground">${generatedContract.totalOneTime.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Recurring</span>
                        <span className="font-display font-bold text-accent">${generatedContract.totalMonthly.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex justify-between text-base mt-2">
                        <span className="font-display font-bold text-foreground">Grand Total</span>
                        <span className="font-display font-bold gradient-text">${generatedContract.grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card neon-border">
                  <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Payment Schedule</CardTitle></CardHeader>
                  <CardContent>
                    {generatedContract.paymentSchedule.map((ps, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1">
                        <span className="text-muted-foreground">{ps.milestone} ({ps.percentage}%)</span>
                        <span className="font-display font-semibold text-foreground">${ps.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="glass-card neon-border">
                  <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Key Terms</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {generatedContract.keyTerms.map((term, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>{term}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button onClick={saveContract} disabled={saving} className="flex-1 font-display text-sm tracking-wider uppercase">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Contract"}
                  </Button>
                  <Button variant="outline" onClick={() => setGeneratedContract(null)}>Regenerate</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {contracts.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-display">No contracts yet</p>
          <p className="text-sm text-muted-foreground mt-1">Click "Generate Contract" to create your first one</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {contracts.map((contract) => {
            const isEditing = editingContractId === contract.id;
            return (
              <Card key={contract.id} className="glass-card neon-border">
                <CardContent className="p-6">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                        <Input value={editFields.title} onChange={e => setEditFields({ ...editFields, title: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Scope Summary</label>
                        <Textarea value={editFields.scope_summary} onChange={e => setEditFields({ ...editFields, scope_summary: e.target.value })} rows={3} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Total Amount</label>
                          <Input type="number" value={editFields.total_amount} onChange={e => setEditFields({ ...editFields, total_amount: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Monthly Recurring</label>
                          <Input type="number" value={editFields.recurring_monthly} onChange={e => setEditFields({ ...editFields, recurring_monthly: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Terms Text</label>
                        <Textarea value={editFields.terms_text} onChange={e => setEditFields({ ...editFields, terms_text: e.target.value })} rows={5} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingContractId(null)} className="gap-1"><X className="h-3.5 w-3.5" /> Cancel</Button>
                        <Button size="sm" onClick={saveContractEdit} disabled={savingEdit} className="gap-1">
                          {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-display text-sm font-semibold text-foreground">{contract.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            #{contract.contract_number} · {profiles[contract.client_id]?.full_name || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{contract.scope_summary}</p>
                        </div>
                        <Badge className={contractStatusColors[contract.status]}>{contract.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                        <span className="font-display font-semibold text-foreground">${contract.total_amount.toLocaleString()}</span>
                        {contract.recurring_monthly > 0 && (
                          <span className="text-accent">+ ${contract.recurring_monthly.toLocaleString()}/mo</span>
                        )}
                        <div className="flex-1" />
                        <div className="flex gap-2">
                          {contract.status === "draft" && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(contract.id, "sent")}>Mark Sent</Button>
                          )}
                          {contract.status === "sent" && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(contract.id, "signed")}>Mark Signed</Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => startEditContract(contract)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => downloadContractPdf(contract)}>
                            <Download className="h-3.5 w-3.5" /> PDF
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={() => deleteContract(contract.id)}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Project Detail (extracted) ─── */
interface ProjectDetailProps {
  project: Project;
  profiles: Record<string, Profile>;
  milestones: Milestone[];
  messages: Message[];
  newMessage: string;
  setNewMessage: (v: string) => void;
  onSendMessage: () => void;
  onUpdateProject: (field: keyof Project, value: any) => void;
  onAddMilestone: () => void;
  onToggleMilestone: (m: Milestone) => void;
  onDeleteMilestone: (id: string) => void;
  milestoneDialogOpen: boolean;
  setMilestoneDialogOpen: (v: boolean) => void;
  newMilestoneTitle: string;
  setNewMilestoneTitle: (v: string) => void;
  newMilestoneDesc: string;
  setNewMilestoneDesc: (v: string) => void;
  newMilestoneDue: string;
  setNewMilestoneDue: (v: string) => void;
  onDeleteProject: (id: string) => void;
}

const ProjectDetail = ({
  project, profiles, milestones, messages, newMessage, setNewMessage,
  onSendMessage, onUpdateProject, onAddMilestone, onToggleMilestone,
  onDeleteMilestone, milestoneDialogOpen, setMilestoneDialogOpen,
  newMilestoneTitle, setNewMilestoneTitle, newMilestoneDesc, setNewMilestoneDesc,
  newMilestoneDue, setNewMilestoneDue, onDeleteProject,
}: ProjectDetailProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 space-y-6">
      {/* Management Card */}
      <Card className="glass-card neon-border">
        <CardHeader><CardTitle className="font-display text-base">Project Management</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">{project.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <Select value={project.status} onValueChange={(v) => onUpdateProject("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Payment Status</label>
              <Select value={project.payment_status} onValueChange={(v) => onUpdateProject("payment_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Progress</label>
              <Input type="number" min={0} max={100} value={project.progress} onChange={(e) => onUpdateProject("progress", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Quoted ($)</label>
              <Input type="number" min={0} value={project.quoted_amount} onChange={(e) => onUpdateProject("quoted_amount", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Paid ($)</label>
              <Input type="number" min={0} value={project.paid_amount} onChange={(e) => onUpdateProject("paid_amount", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Timeline</label>
              <Input value={(project as any).estimated_timeline || ""} onChange={(e) => onUpdateProject("estimated_timeline" as any, e.target.value)} placeholder="e.g. 6-8 weeks" />
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <Button variant="destructive" size="sm" className="gap-2" onClick={() => onDeleteProject(project.id)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete Project
            </Button>
          </div>

          {profiles[project.client_id] && (
            <div className="border-t border-border pt-4 mt-4">
              <p className="text-xs text-muted-foreground mb-2">Client Information</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="text-foreground font-medium">{profiles[project.client_id].full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Company</p>
                  <p className="text-foreground">{profiles[project.client_id].company_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="text-foreground">{(profiles[project.client_id] as any).phone || "—"}</p>
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
                <Button onClick={onAddMilestone} className="w-full font-display text-sm">Add Milestone</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No milestones yet.</p>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 group">
                  <button onClick={() => onToggleMilestone(m)} className="flex-shrink-0">
                    <CheckCircle className={`h-5 w-5 transition-colors ${m.is_completed ? "text-primary" : "text-border hover:text-muted-foreground"}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${m.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                  </div>
                  {m.due_date && <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(m.due_date).toLocaleDateString()}</span>}
                  <button onClick={() => onDeleteMilestone(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive">
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
            onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
          />
          <Button size="icon" onClick={onSendMessage}><Send className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default AdminDashboard;
