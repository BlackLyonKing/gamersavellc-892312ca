import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Loader2, Plus, Trash2, DollarSign, Building, Users, CheckCircle, PieChart, Pencil, Save, X,
} from "lucide-react";
import type { Profile } from "./AdminProjectList";

interface PaymentSplit {
  id: string;
  contract_id: string;
  recipient_type: "company" | "admin";
  recipient_id: string | null;
  percentage: number;
  amount: number;
  paid: boolean;
  paid_at: string | null;
  created_at: string;
}

interface Contract {
  id: string;
  title: string;
  contract_number: string;
  total_amount: number;
  client_id: string;
  status: string;
}

interface AdminPaymentSplitsProps {
  profiles: Record<string, Profile & { phone?: string | null }>;
}

const AdminPaymentSplits = ({ profiles }: AdminPaymentSplitsProps) => {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [splits, setSplits] = useState<PaymentSplit[]>([]);
  const [adminUsers, setAdminUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // Add split form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<"company" | "admin">("company");
  const [recipientId, setRecipientId] = useState("");
  const [percentage, setPercentage] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPercentage, setEditPercentage] = useState("");
  const [editRecipientType, setEditRecipientType] = useState<"company" | "admin">("company");
  const [editRecipientId, setEditRecipientId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: contractData }, { data: splitData }, { data: roles }, { data: profileData }] = await Promise.all([
      supabase.from("contracts").select("id, title, contract_number, total_amount, client_id, status").order("created_at", { ascending: false }),
      supabase.from("payment_splits").select("*").order("created_at"),
      supabase.from("user_roles").select("*").eq("role", "admin" as any),
      supabase.from("profiles").select("*"),
    ]);
    setContracts((contractData as Contract[]) || []);
    setSplits((splitData as PaymentSplit[]) || []);

    const adminIds = new Set((roles || []).map((r: any) => r.user_id));
    const admins = (profileData || [])
      .filter((p: any) => adminIds.has(p.id))
      .map((p: any) => ({ id: p.id, name: p.full_name || "Unnamed" }));
    setAdminUsers(admins);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const contractSplits = splits.filter((s) => s.contract_id === selectedContractId);
  const totalAllocated = contractSplits.reduce((sum, s) => sum + s.percentage, 0);
  const selectedContract = contracts.find((c) => c.id === selectedContractId);

  const addSplit = async () => {
    if (!selectedContractId || !percentage) return;
    const pct = parseFloat(percentage);
    if (pct <= 0 || pct > 100) {
      toast({ title: "Percentage must be between 0 and 100", variant: "destructive" });
      return;
    }
    if (totalAllocated + pct > 100) {
      toast({ title: `Only ${(100 - totalAllocated).toFixed(1)}% remaining`, variant: "destructive" });
      return;
    }
    if (recipientType === "admin" && !recipientId) {
      toast({ title: "Please select an admin", variant: "destructive" });
      return;
    }
    setSaving(true);
    const amount = selectedContract ? (selectedContract.total_amount * pct) / 100 : 0;
    const { error } = await supabase.from("payment_splits").insert({
      contract_id: selectedContractId,
      recipient_type: recipientType,
      recipient_id: recipientType === "admin" ? recipientId : null,
      percentage: pct,
      amount,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment split added!" });
      setDialogOpen(false);
      setPercentage("");
      setRecipientId("");
      setRecipientType("company");
      fetchData();
    }
    setSaving(false);
  };

  const deleteSplit = async (id: string) => {
    const { error } = await supabase.from("payment_splits").delete().eq("id", id);
    if (!error) {
      setSplits((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Split removed" });
    }
  };

  const togglePaid = async (split: PaymentSplit) => {
    const updates: any = { paid: !split.paid, paid_at: !split.paid ? new Date().toISOString() : null };
    const { error } = await supabase.from("payment_splits").update(updates).eq("id", split.id);
    if (!error) {
      setSplits((prev) => prev.map((s) => s.id === split.id ? { ...s, ...updates } : s));
      toast({ title: split.paid ? "Marked unpaid" : "Marked paid" });
    }
  };

  const getRecipientName = (split: PaymentSplit) => {
    if (split.recipient_type === "company") return "Gamers Ave LLC (Company)";
    const profile = Object.values(profiles).find((p) => p.id === split.recipient_id);
    return profile?.full_name || "Unknown Admin";
  };

  if (loading) return <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>;

  return (
    <div>
      <h2 className="font-display text-base font-semibold text-foreground mb-6">Payment Splits</h2>

      {/* Contract selector */}
      <div className="mb-6">
        <label className="text-sm text-muted-foreground block mb-2">Select Contract</label>
        <Select value={selectedContractId || ""} onValueChange={setSelectedContractId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Choose a contract..." />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title} — ${c.total_amount.toLocaleString()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedContractId && selectedContract && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="glass-card neon-border">
              <CardContent className="p-4 flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Contract Total</p>
                  <p className="font-display font-bold text-foreground">${selectedContract.total_amount.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card neon-border">
              <CardContent className="p-4 flex items-center gap-3">
                <PieChart className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Allocated</p>
                  <p className="font-display font-bold text-foreground">{totalAllocated.toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card neon-border">
              <CardContent className="p-4 flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="font-display font-bold text-foreground">{(100 - totalAllocated).toFixed(1)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add split button */}
          <div className="flex justify-end mb-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 font-display text-xs tracking-wider uppercase" disabled={totalAllocated >= 100}>
                  <Plus className="h-4 w-4" /> Add Split
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Add Payment Split</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">Recipient Type</label>
                    <Select value={recipientType} onValueChange={(v) => setRecipientType(v as "company" | "admin")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Company (Gamers Ave LLC)</SelectItem>
                        <SelectItem value="admin">Admin Team Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {recipientType === "admin" && (
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">Select Admin</label>
                      <Select value={recipientId} onValueChange={setRecipientId}>
                        <SelectTrigger><SelectValue placeholder="Choose admin..." /></SelectTrigger>
                        <SelectContent>
                          {adminUsers.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-muted-foreground block mb-1">
                      Percentage (max {(100 - totalAllocated).toFixed(1)}%)
                    </label>
                    <Input
                      type="number"
                      min={0.1}
                      max={100 - totalAllocated}
                      step={0.1}
                      placeholder="e.g. 30"
                      value={percentage}
                      onChange={(e) => setPercentage(e.target.value)}
                    />
                    {percentage && selectedContract && (
                      <p className="text-xs text-muted-foreground mt-1">
                        = ${((selectedContract.total_amount * parseFloat(percentage || "0")) / 100).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <Button onClick={addSplit} disabled={saving} className="w-full font-display text-sm">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Split"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Splits list */}
          {contractSplits.length === 0 ? (
            <div className="text-center py-12">
              <PieChart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-display text-sm">No payment splits configured</p>
              <p className="text-xs text-muted-foreground mt-1">Add splits to define how this contract's payment is distributed</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {contractSplits.map((split, i) => (
                <motion.div key={split.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className="glass-card neon-border">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${split.recipient_type === "company" ? "bg-primary/20" : "bg-accent/20"}`}>
                          {split.recipient_type === "company"
                            ? <Building className="h-5 w-5 text-primary" />
                            : <Users className="h-5 w-5 text-accent" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-sm font-semibold text-foreground">{getRecipientName(split)}</h3>
                            {split.paid && <Badge className="bg-primary/20 text-primary text-[10px]">Paid</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {split.percentage}% — ${split.amount.toLocaleString()}
                          </p>
                          {split.paid_at && (
                            <p className="text-xs text-muted-foreground">Paid {new Date(split.paid_at).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant={split.paid ? "outline" : "default"}
                            className="text-xs gap-1"
                            onClick={() => togglePaid(split)}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {split.paid ? "Unpay" : "Mark Paid"}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={() => deleteSplit(split.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
  );
};

export default AdminPaymentSplits;
