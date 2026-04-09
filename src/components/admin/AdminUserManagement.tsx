import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, ShieldOff, Users, Loader2, Building, Phone } from "lucide-react";
import type { Profile } from "./AdminProjectList";

interface UserWithRole {
  profile: Profile & { phone?: string | null };
  isAdmin: boolean;
}

const AdminUserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; user: UserWithRole | null; action: "promote" | "demote" }>({
    open: false, user: null, action: "promote",
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
    ]);

    const adminIds = new Set((roles || []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));

    const mapped: UserWithRole[] = (profiles || []).map((p: any) => ({
      profile: p,
      isAdmin: adminIds.has(p.id),
    }));

    mapped.sort((a, b) => (a.isAdmin === b.isAdmin ? 0 : a.isAdmin ? -1 : 1));
    setUsers(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleChange = async () => {
    const { user, action } = confirmDialog;
    if (!user) return;

    if (action === "promote") {
      const { error } = await supabase.from("user_roles").insert({ user_id: user.profile.id, role: "admin" as any });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: `${user.profile.full_name} promoted to admin` });
      }
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user.profile.id).eq("role", "admin" as any);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: `${user.profile.full_name} removed from admin` });
      }
    }

    setConfirmDialog({ open: false, user: null, action: "promote" });
    fetchUsers();
  };

  if (loading) return <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>;

  return (
    <div>
      <h2 className="font-display text-base font-semibold text-foreground mb-6">User Management</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {users.map((u, i) => (
          <motion.div key={u.profile.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="glass-card neon-border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${u.isAdmin ? "bg-primary/20" : "bg-muted"}`}>
                    {u.isAdmin ? <Shield className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm font-semibold text-foreground">{u.profile.full_name || "Unnamed"}</h3>
                      {u.isAdmin && <Badge className="bg-primary/20 text-primary text-[10px]">Admin</Badge>}
                    </div>
                    {u.profile.company_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building className="h-3 w-3" /> {u.profile.company_name}
                      </p>
                    )}
                    {u.profile.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {u.profile.phone}
                      </p>
                    )}
                    <div className="mt-3">
                      {u.isAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs gap-1.5"
                          onClick={() => setConfirmDialog({ open: true, user: u, action: "demote" })}
                        >
                          <ShieldOff className="h-3 w-3" /> Remove Admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs gap-1.5"
                          onClick={() => setConfirmDialog({ open: true, user: u, action: "promote" })}
                        >
                          <Shield className="h-3 w-3" /> Make Admin
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "promote" ? "Promote to Admin?" : "Remove Admin Access?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "promote"
                ? `${confirmDialog.user?.profile.full_name} will gain full admin access to manage projects, contracts, invoices, and users.`
                : `${confirmDialog.user?.profile.full_name} will lose admin privileges and only have client-level access.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange}>
              {confirmDialog.action === "promote" ? "Promote" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUserManagement;
