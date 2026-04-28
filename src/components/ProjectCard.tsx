import { motion } from "framer-motion";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Expand } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  tech_stack: string[];
  category: string;
  screenshot: string;
}

interface ProjectCardProps {
  project: Project;
  index: number;
}

const ProjectCard = ({ project, index }: ProjectCardProps) => {
  const [open, setOpen] = useState(false);
  return (
    <>
    <motion.div
      className="group glass-card rounded-xl p-6 flex flex-col neon-border-hover transition-all duration-500"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      <span className="text-primary font-display text-[10px] tracking-[0.2em] uppercase mb-3">
        {project.category}
      </span>
      <h3 className="font-display text-lg font-bold text-foreground mb-3 group-hover:gradient-text transition-colors duration-300">
        {project.name}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed mb-5">
        {project.description}
      </p>
      {project.screenshot && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`View full ${project.name} screenshot`}
          className="relative rounded-lg overflow-hidden border border-border mb-5 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <img
            src={project.screenshot}
            alt={`${project.name} homepage screenshot`}
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur px-2 py-1 text-[10px] font-display tracking-wider uppercase text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Expand className="w-3 h-3 text-primary" /> View
          </span>
        </button>
      )}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {project.tech_stack.map((tech) => (
          <span
            key={tech}
            className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium"
          >
            {tech}
          </span>
        ))}
      </div>
    </motion.div>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden bg-background/95 backdrop-blur border-primary/30">
        <DialogTitle className="sr-only">{project.name} screenshot</DialogTitle>
        <DialogDescription className="sr-only">Full preview of the {project.name} homepage.</DialogDescription>
        <div className="max-h-[85vh] overflow-y-auto">
          {project.screenshot && (
            <img
              src={project.screenshot}
              alt={`${project.name} full homepage screenshot`}
              className="w-full h-auto"
            />
          )}
        </div>
        <div className="px-6 py-4 border-t border-border">
          <p className="text-primary font-display text-[10px] tracking-[0.2em] uppercase mb-1">{project.category}</p>
          <h3 className="font-display text-lg font-bold text-foreground">{project.name}</h3>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ProjectCard;
