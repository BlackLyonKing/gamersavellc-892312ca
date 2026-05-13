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
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="glass-card neon-border">
          <CardContent className="p-2.5 sm:p-3 flex items-center gap-2">
            <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary/70 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-display font-bold text-foreground leading-tight truncate">{stat.value}</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight truncate">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminStats;
