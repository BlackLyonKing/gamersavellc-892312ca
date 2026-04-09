import { useEffect, useState, useCallback } from "react";
import jsPDF from "jspdf";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Loader2, FileText, Plus, DollarSign, Download, Send, Eye, Pencil, Save, X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

interface MonthlyPaymentPlan {
  termMonths: number;
  monthlyAmount: number;
  totalWithFees: number;
  financingFeePercent: number;
  financingFeeAmount: number;
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
  monthlyPaymentPlans: MonthlyPaymentPlan[];
  fullContractText: string;
  keyTerms: string[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  quoted_amount: number | null;
  tech_stack: string[] | null;
  estimated_timeline: string | null;
  client_id: string;
}

interface Profile {
  id: string;
  full_name: string;
  company_name: string | null;
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

const feeTypeLabels: Record<string, string> = {
  one_time: "One-Time",
  monthly: "Monthly",
  hourly: "Hourly",
  milestone: "Milestone",
};

const Contracts = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  // Generator state
  const [generating, setGenerating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewContract, setViewContract] = useState<ContractRecord | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && user && !isAdmin) navigate("/dashboard");
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchContracts();
      fetchProjects();
    }
  }, [user, isAdmin]);

  const fetchContracts = async () => {
    const { data } = await supabase.from("contracts").select("*").order("created_at", { ascending: false });
    setContracts((data as ContractRecord[]) || []);
    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
    const projectList = (data as Project[]) || [];
    setProjects(projectList);

    const clientIds = [...new Set(projectList.map((p) => p.client_id))];
    if (clientIds.length > 0) {
      const { data: profileData } = await supabase.from("profiles").select("id, full_name, company_name").in("id", clientIds);
      const map: Record<string, Profile> = {};
      (profileData || []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
  };

  const generateContract = async () => {
    const project = projects.find((p) => p.id === selectedProjectId);
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
    if (!generatedContract) return;
    setSaving(true);

    const project = projects.find((p) => p.id === selectedProjectId);
    const contractNumber = `GA-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase.from("contracts").insert({
      project_id: project?.id || null,
      client_id: project?.client_id || user!.id,
      contract_number: contractNumber,
      title: generatedContract.contractTitle,
      scope_summary: generatedContract.scopeSummary,
      fee_breakdown: generatedContract.feeBreakdown as any,
      total_amount: generatedContract.grandTotal,
      recurring_monthly: generatedContract.totalMonthly,
      terms_text: generatedContract.fullContractText,
      status: "draft" as any,
    });

    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
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

  const updateContractStatus = async (id: string, status: string) => {
    const updateData: Record<string, any> = { status };
    if (status === "signed") updateData.signed_at = new Date().toISOString();
    const { error } = await supabase.from("contracts").update(updateData as any).eq("id", id);
    if (!error) {
      fetchContracts();
      if (viewContract?.id === id) setViewContract({ ...viewContract, status } as ContractRecord);
      toast({ title: `Contract marked as ${status}` });
    }
  };

  const downloadContract = useCallback((contract: ContractRecord) => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 50;
    const usable = pageWidth - margin * 2;
    let y = margin;

    const addPage = () => { doc.addPage(); y = margin; };
    const checkPage = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - margin) addPage();
    };

    // Header bar
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

    // Fee breakdown table
    const fees = (Array.isArray(contract.fee_breakdown) ? contract.fee_breakdown : []) as FeeItem[];
    if (fees.length > 0) {
      checkPage(40 + fees.length * 22);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("FEE BREAKDOWN", margin, y);
      y += 20;

      // Table header
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

      // Totals
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

    // Full contract text
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

    // Footer on last page
    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${contract.contract_number} — Gamers Ave LLC`, margin, footerY);
    doc.text("Confidential", pageWidth - margin, footerY, { align: "right" });

    doc.save(`${contract.contract_number}-${contract.title.replace(/\s+/g, "-")}.pdf`);
  }, []);

  if (authLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sent: "bg-accent/20 text-accent",
    signed: "bg-primary/20 text-primary",
    expired: "bg-destructive/20 text-destructive",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">Contract Generator</h1>
              <p className="text-xs text-muted-foreground">AI-powered contract creation</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 font-display text-xs tracking-wider uppercase">
                <Plus className="h-4 w-4" /> New Contract
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
                        {projects.map((p) => (
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

                  {/* Fee breakdown */}
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

                  {/* Payment Schedule */}
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

                  {/* Monthly Payment Plans */}
                  {generatedContract.monthlyPaymentPlans && generatedContract.monthlyPaymentPlans.length > 0 && (
                    <Card className="glass-card neon-border">
                      <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Monthly Payment Plan Options</CardTitle></CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground mb-3">
                          Break the ${generatedContract.totalOneTime.toLocaleString()} one-time cost into monthly payments:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {generatedContract.monthlyPaymentPlans.map((plan, i) => (
                            <div key={i} className="border border-border rounded-lg p-3 space-y-1">
                              <div className="font-display font-bold text-foreground text-base">
                                ${plan.monthlyAmount.toLocaleString()}<span className="text-xs text-muted-foreground font-normal">/mo</span>
                              </div>
                              <div className="text-xs text-muted-foreground">{plan.termMonths} months</div>
                              {plan.financingFeePercent > 0 ? (
                                <div className="text-[10px] text-muted-foreground">
                                  {plan.financingFeePercent}% fee · Total: ${plan.totalWithFees.toLocaleString()}
                                </div>
                              ) : (
                                <div className="text-[10px] text-primary">0% interest</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Key Terms */}
                  <Card className="glass-card neon-border">
                    <CardHeader className="pb-2"><CardTitle className="font-display text-sm">Key Terms</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {generatedContract.keyTerms.map((term, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span> {term}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button onClick={saveContract} disabled={saving} className="flex-1 font-display text-sm tracking-wider uppercase">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Contract"}
                    </Button>
                    <Button variant="outline" onClick={() => setGeneratedContract(null)}>Regenerate</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {viewContract ? (
          /* Contract Detail View */
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button variant="ghost" size="sm" onClick={() => setViewContract(null)} className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to contracts
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="glass-card neon-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-base">{viewContract.title}</CardTitle>
                      <Badge className={statusColors[viewContract.status]}>{viewContract.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">#{viewContract.contract_number}</p>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                      {viewContract.terms_text}
                    </pre>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="glass-card neon-border">
                  <CardHeader><CardTitle className="font-display text-sm">Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{viewContract.scope_summary}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-display font-bold gradient-text">${viewContract.total_amount.toLocaleString()}</span>
                    </div>
                    {viewContract.recurring_monthly > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Monthly</span>
                        <span className="font-display font-semibold text-accent">${viewContract.recurring_monthly.toLocaleString()}/mo</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass-card neon-border">
                  <CardHeader><CardTitle className="font-display text-sm">Actions</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {viewContract.status === "draft" && (
                      <Button size="sm" className="w-full gap-2" onClick={() => updateContractStatus(viewContract.id, "sent")}>
                        <Send className="h-4 w-4" /> Mark as Sent
                      </Button>
                    )}
                    {viewContract.status === "sent" && (
                      <Button size="sm" className="w-full gap-2" onClick={() => updateContractStatus(viewContract.id, "signed")}>
                        <FileText className="h-4 w-4" /> Mark as Signed
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => downloadContract(viewContract)}>
                      <Download className="h-4 w-4" /> Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Contract List */
          <>
            {loading ? (
              <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
            ) : contracts.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-display">No contracts yet</p>
                <p className="text-sm text-muted-foreground mt-2">Click "New Contract" to generate one with AI</p>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {contracts.map((contract, i) => (
                  <motion.div key={contract.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="glass-card neon-border neon-border-hover cursor-pointer transition-all" onClick={() => setViewContract(contract)}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-display text-sm font-semibold text-foreground">{contract.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">#{contract.contract_number}</p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{contract.scope_summary}</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Badge className={statusColors[contract.status]}>{contract.status}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />${contract.total_amount.toLocaleString()}</span>
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
          </>
        )}
      </div>
    </div>
  );
};

export default Contracts;
