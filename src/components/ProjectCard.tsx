import { motion } from "framer-motion";
import type { Project } from "@/data/projects";

interface ProjectCardProps {
  project: Project;
  index: number;
}

const ProjectCard = ({ project, index }: ProjectCardProps) => {
  return (
    <motion.div
      className="group glass-card rounded-xl p-6 flex flex-col neon-border-hover transition-all duration-500"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
    >
      {/* Category */}
      <span className="text-primary font-display text-[10px] tracking-[0.2em] uppercase mb-3">
        {project.category}
      </span>

      {/* Title */}
      <h3 className="font-display text-lg font-bold text-foreground mb-3 group-hover:gradient-text transition-colors duration-300">
        {project.name}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground text-sm leading-relaxed mb-5">
        {project.description}
      </p>

      {/* Screenshot */}
      <div className="rounded-lg overflow-hidden border border-border mb-5">
        <img
          src={project.screenshot}
          alt={`${project.name} homepage screenshot`}
          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Tech Stack */}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {project.techStack.map((tech) => (
          <span
            key={tech}
            className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium"
          >
            {tech}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

export default ProjectCard;
