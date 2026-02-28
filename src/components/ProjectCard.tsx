import { motion } from "framer-motion";
import type { Project } from "@/data/projects";

interface ProjectCardProps {
  project: Project;
  index: number;
}

const ProjectCard = ({ project, index }: ProjectCardProps) => {
  return (
    <motion.a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group glass-card rounded-xl p-6 flex flex-col neon-border-hover transition-all duration-500 cursor-pointer"
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
      <p className="text-muted-foreground text-sm leading-relaxed mb-5 flex-1">
        {project.description}
      </p>

      {/* Tech Stack */}
      <div className="flex flex-wrap gap-1.5">
        {project.techStack.map((tech) => (
          <span
            key={tech}
            className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-[11px] font-medium"
          >
            {tech}
          </span>
        ))}
      </div>

      {/* View link */}
      <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-primary text-xs font-display tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span>View Live</span>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
        </svg>
      </div>
    </motion.a>
  );
};

export default ProjectCard;
