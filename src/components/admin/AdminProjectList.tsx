import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, DollarSign, Clock, Loader2, FolderOpen } from "lucide-react";

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
  created_at: string;
  client_id: string;
}

interface Profile {
  id: string;
  full_name: string;
  company_name: string | null;
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

interface AdminProjectListProps {
  projects: Project[];
  profiles: Record<string, Profile>;
  loading: boolean;
  onSelectProject: (project: Project) => void;
}

const AdminProjectList = ({ projects, profiles, loading, onSelectProject }: AdminProjectListProps) => {
  if (loading) return <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>;

  if (projects.length === 0) return (
    <div className="text-center py-16">
      <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
      <p className="text-muted-foreground font-display">No projects yet</p>
    </div>
  );

  return (
    <div className="grid gap-4">
      {projects.map((project, i) => (
        <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
          <Card className="glass-card neon-border neon-border-hover cursor-pointer transition-all" onClick={() => onSelectProject(project)}>
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
  );
};

export default AdminProjectList;
export type { Project, Profile, ProjectStatus, PaymentStatus };
export { statusColors, paymentColors };
