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
      className="group flex flex-col rounded-2xl overflow-hidden border border-border/50 bg-card/40 backdrop-blur transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_30px_hsl(160_100%_45%/0.08)]"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      {/* Image leads */}
      <button
        type="button"
        onClick={() => project.screenshot && setOpen(true)}
        disabled={!project.screenshot}
        aria-label={`View full ${project.name} screenshot`}
        className="relative aspect-video w-full overflow-hidden bg-muted/30 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
      >
        {project.screenshot && (
          <img
            src={project.screenshot}
            alt={`${project.name} homepage screenshot`}
            loading="lazy"
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/20 to-transparent pointer-events-none" />
        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-sm bg-primary/90 text-primary-foreground text-[9px] font-display font-bold uppercase tracking-wider">
          {project.category}
        </span>
        {project.screenshot && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md bg-background/80 backdrop-blur px-2 py-1 text-[10px] font-display tracking-wider uppercase text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <Expand className="w-3 h-3 text-primary" /> View
          </span>
        )}
      </button>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors mb-2 leading-tight">
          {project.name}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-5 line-clamp-2">
          {project.description}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5">
          {project.tech_stack.map((tech) => (
            <span
              key={tech}
              className="font-mono text-[9px] px-2 py-0.5 rounded border border-border/60 bg-secondary/40 text-muted-foreground uppercase tracking-tight"
            >
              {tech}
            </span>
          ))}
        </div>
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
