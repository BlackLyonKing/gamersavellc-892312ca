import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, BarChart3, Clock, DollarSign, FileText, Receipt } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface StatItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

interface AdminStatsProps {
  projectCount: number;
  activeCount: number;
  pendingCount: number;
  revenue: number;
  contractCount: number;
  invoiceCount: number;
}

const AdminStats = ({ projectCount, activeCount, pendingCount, revenue, contractCount, invoiceCount }: AdminStatsProps) => {
  const stats: StatItem[] = [
    { label: "Total Projects", value: projectCount, icon: FolderOpen },
    { label: "Active", value: activeCount, icon: BarChart3 },
    { label: "Pending", value: pendingCount, icon: Clock },
    { label: "Revenue", value: `$${revenue.toLocaleString()}`, icon: DollarSign },
    { label: "Contracts", value: contractCount, icon: FileText },
    { label: "Invoices", value: invoiceCount, icon: Receipt },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-card neon-border">
          <CardContent className="p-4 flex items-center gap-3">
            <stat.icon className="h-7 w-7 text-primary/60 flex-shrink-0" />
            <div>
              <p className="text-xl font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminStats;
