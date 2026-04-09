import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import ProjectCard from "@/components/ProjectCard";
import { Loader2 } from "lucide-react";

interface PortfolioProject {
  id: string;
  name: string;
  description: string;
  tech_stack: string[];
  category: string;
  screenshot: string;
}

const ProjectsSection = () => {
  const [active, setActive] = useState("All");
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("portfolio_projects")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        setProjects((data as PortfolioProject[]) || []);
        setLoading(false);
      });
  }, []);

  const categories = ["All", ...Array.from(new Set(projects.map((p) => p.category)))];
  const filtered = active === "All" ? projects : projects.filter((p) => p.category === active);

  return (
    <section id="projects" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-primary font-display text-xs tracking-[0.3em] uppercase mb-4">
            Portfolio
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Published <span className="gradient-text">Projects</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Each project showcases our expertise across full-stack development, blockchain integration, and modern UI/UX design.
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
        ) : (
          <>
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  className={`px-4 py-2 rounded-lg text-xs font-display tracking-wider uppercase transition-all duration-300 ${
                    active === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((project, i) => (
                <ProjectCard key={project.id} project={project} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ProjectsSection;
