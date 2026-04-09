import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, Mail, Phone, Building } from "lucide-react";
import type { Profile } from "./AdminProjectList";

interface ProjectSummary {
  client_id: string;
  count: number;
  totalPaid: number;
}

interface AdminClientsProps {
  profiles: Record<string, Profile & { phone?: string | null; avatar_url?: string | null }>;
  projectSummaries: ProjectSummary[];
  loading: boolean;
}

const AdminClients = ({ profiles, projectSummaries, loading }: AdminClientsProps) => {
  if (loading) return <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>;

  const clients = Object.values(profiles);

  if (clients.length === 0) return (
    <div className="text-center py-16">
      <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
      <p className="text-muted-foreground font-display">No clients yet</p>
    </div>
  );

  return (
    <div>
      <h2 className="font-display text-base font-semibold text-foreground mb-6">All Clients</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {clients.map((client, i) => {
          const summary = projectSummaries.find((s) => s.client_id === client.id);
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
                      <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                        <Badge variant="secondary">{summary?.count || 0} projects</Badge>
                        <span className="font-display font-semibold text-foreground">
                          ${(summary?.totalPaid || 0).toLocaleString()} paid
                        </span>
                      </div>
                    </div>
                  </div>
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
