import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft } from "lucide-react";

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  onSignOut: () => void;
  onBack?: () => void;
}

const AdminHeader = ({ title, subtitle, onSignOut, onBack }: AdminHeaderProps) => (
  <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {onBack ? (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        )}
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onSignOut} className="gap-2 text-muted-foreground">
        <LogOut className="h-4 w-4" /> Sign Out
      </Button>
    </div>
  </div>
);

export default AdminHeader;
