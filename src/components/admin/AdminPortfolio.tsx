import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Save, X, Loader2, GripVertical, ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

interface PortfolioProject {
  id: string;
  name: string;
  description: string;
  tech_stack: string[];
  category: string;
  screenshot: string;
  sort_order: number;
}

const emptyProject = { name: "", description: "", tech_stack: [] as string[], category: "", screenshot: "" };

const AdminPortfolio = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProject);
  const [techInput, setTechInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from("portfolio_projects")
      .select("*")
      .order("sort_order");
    setProjects((data as PortfolioProject[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyProject);
    setTechInput("");
    setDialogOpen(true);
  };

  const openEdit = (p: PortfolioProject) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description, tech_stack: p.tech_stack, category: p.category, screenshot: p.screenshot });
    setTechInput(p.tech_stack.join(", "));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    setSaving(true);
    const techStack = techInput.split(",").map(s => s.trim()).filter(Boolean);
    const payload = { ...form, tech_stack: techStack };

    if (editingId) {
      const { error } = await supabase.from("portfolio_projects").update(payload as any).eq("id", editingId);
      if (error) {
        console.error("Portfolio update failed", error);
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Project updated!" });
    } else {
      const maxOrder = projects.length > 0 ? Math.max(...projects.map(p => p.sort_order)) + 1 : 0;
      const { error } = await supabase
        .from("portfolio_projects")
        .insert({ ...payload, sort_order: maxOrder } as any)
        .select()
        .single();
      if (error) {
        console.error("Portfolio insert failed", error);
        toast({ title: "Couldn't add project", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Project added!" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("portfolio_projects").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Project deleted" }); fetchProjects(); }
  };

  if (loading) return <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">{projects.length} portfolio projects</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Project</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? "Edit" : "Add"} Portfolio Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Project name" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Web3 / DeFi" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief project description" rows={3} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tech Stack (comma-separated)</label>
                <Input value={techInput} onChange={e => setTechInput(e.target.value)} placeholder="React, TypeScript, Solana" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Screenshot URL</label>
                <Input value={form.screenshot} onChange={e => setForm({ ...form, screenshot: e.target.value })} placeholder="/screenshots/project.png" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingId ? "Save Changes" : "Add Project"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {projects.map((project, i) => (
          <motion.div key={project.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="glass-card neon-border">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {project.screenshot ? (
                    <img src={project.screenshot} alt={project.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-foreground">{project.name}</h3>
                      <Badge variant="outline" className="text-[10px] mt-1">{project.category}</Badge>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(project)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(project.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {project.tech_stack.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground text-[10px]">{t}</span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminPortfolio;
