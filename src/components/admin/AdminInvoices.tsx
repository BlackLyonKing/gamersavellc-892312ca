import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Receipt, DollarSign, Send } from "lucide-react";
import type { Profile } from "./AdminProjectList";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  description: string;
  due_date: string | null;
  status: string;
  client_id: string;
  project_id: string | null;
  contract_id: string | null;
  created_at: string;
  paid_at: string | null;
}

interface Project {
  id: string;
  title: string;
  client_id: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-accent/20 text-accent",
  paid: "bg-primary/20 text-primary",
  overdue: "bg-destructive/20 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

interface AdminInvoicesProps {
  profiles: Record<string, Profile>;
}

const AdminInvoices = ({ profiles }: AdminInvoicesProps) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchInvoices = useCallback(async () => {
    const { data } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
    setInvoices((data as Invoice[]) || []);
    setLoading(false);
  }, []);

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase.from("projects").select("id, title, client_id").order("created_at", { ascending: false });
    setProjects((data as Project[]) || []);
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchProjects();
  }, [fetchInvoices, fetchProjects]);

  const createInvoice = async () => {
    if (!amount || !description.trim()) return;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) {
      toast({ title: "Please select a project", variant: "destructive" });
      return;
    }
    setSaving(true);
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("invoices").insert({
      invoice_number: invoiceNumber,
      client_id: project.client_id,
      project_id: project.id,
      amount: parseFloat(amount),
      description,
      due_date: dueDate || null,
      status: "draft" as any,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invoice created!" });
      setDialogOpen(false);
      setAmount("");
      setDescription("");
      setDueDate("");
      setSelectedProjectId("");
      fetchInvoices();
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const updateData: Record<string, any> = { status };
    if (status === "paid") updateData.paid_at = new Date().toISOString();
    const { error } = await supabase.from("invoices").update(updateData as any).eq("id", id);
    if (!error) {
      fetchInvoices();
      toast({ title: `Invoice marked as ${status}` });
    }
  };

  if (loading) return <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-base font-semibold text-foreground">All Invoices</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 font-display text-xs tracking-wider uppercase">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create Invoice</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Project</label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input type="number" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <Textarea placeholder="Invoice description..." value={description} onChange={(e) => setDescription(e.target.value)} />
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <Button onClick={createInvoice} disabled={saving} className="w-full font-display text-sm">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Invoice"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-16">
          <Receipt className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-display">No invoices yet</p>
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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {profiles[inv.client_id]?.full_name || "Unknown Client"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{inv.description}</p>
                    </div>
                    <div className="flex gap-2 items-center flex-shrink-0">
                      <Badge className={statusColors[inv.status]}>{inv.status}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                    <span className="flex items-center gap-1 font-display font-semibold text-foreground">
                      <DollarSign className="h-3.5 w-3.5" />${inv.amount.toLocaleString()}
                    </span>
                    {inv.due_date && <span>Due: {new Date(inv.due_date).toLocaleDateString()}</span>}
                    <div className="flex-1" />
                    <div className="flex gap-2">
                      {inv.status === "draft" && (
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateStatus(inv.id, "sent")}>
                          <Send className="h-3 w-3" /> Send
                        </Button>
                      )}
                      {(inv.status === "sent" || inv.status === "overdue") && (
                        <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => updateStatus(inv.id, "paid")}>
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminInvoices;
