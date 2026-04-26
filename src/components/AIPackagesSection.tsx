import { motion } from "framer-motion";
import { Compass, ClipboardCheck, FlaskConical, Rocket } from "lucide-react";

const packages = [
  {
    icon: Compass,
    phase: "Phase 01",
    name: "Discovery",
    timeline: "1 week",
    price: "From $750",
    description:
      "Stakeholder interviews, business goal alignment, and an AI opportunity map tailored to your industry and team size.",
    deliverables: ["Kickoff workshop", "Opportunity scorecard", "Tooling shortlist"],
  },
  {
    icon: ClipboardCheck,
    phase: "Phase 02",
    name: "Workflow Audit",
    timeline: "1–2 weeks",
    price: "From $1,800",
    description:
      "Deep dive into existing operations to map every repetitive task, data silo, and bottleneck ripe for AI automation.",
    deliverables: ["Process maps", "ROI projections", "Automation backlog"],
  },
  {
    icon: FlaskConical,
    phase: "Phase 03",
    name: "Prototype",
    timeline: "2–4 weeks",
    price: "From $3,500",
    description:
      "Build a working AI prototype on your real data — agent, integration, or internal tool — validated with your team.",
    deliverables: ["Working prototype", "Internal demo", "Iteration sprint"],
  },
  {
    icon: Rocket,
    phase: "Phase 04",
    name: "Rollout",
    timeline: "4–8 weeks",
    price: "From $7,500 + retainer",
    description:
      "Production deployment, staff training, monitoring, and an ongoing optimization retainer to keep systems sharp.",
    deliverables: ["Production launch", "Team training", "Monthly optimization"],
  },
];

const AIPackagesSection = () => {
  return (
    <section id="ai-packages" className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-primary font-display text-xs tracking-[0.3em] uppercase mb-4">
            For Small Business
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            AI Integration <span className="gradient-text">Packages</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A clear, phased path from "we should probably use AI" to fully deployed automation.
            Engage one phase at a time or bundle the full journey.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.name}
              className="glass-card rounded-xl p-6 flex flex-col neon-border-hover transition-all duration-500 group relative overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                  <pkg.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="font-display text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
                  {pkg.phase}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-foreground mb-1">
                {pkg.name}
              </h3>
              <p className="text-primary font-display text-xs tracking-wider uppercase mb-4">
                {pkg.timeline} · {pkg.price}
              </p>

              <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                {pkg.description}
              </p>

              <ul className="mt-auto space-y-2 border-t border-border/50 pt-4">
                {pkg.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-foreground/80">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="text-muted-foreground text-sm mb-5">
            Bundle all four phases for a discounted full integration engagement.
          </p>
          <button
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-display text-sm tracking-wider uppercase font-semibold hover:shadow-[0_0_30px_hsl(160_100%_45%/0.4)] transition-all duration-300"
          >
            Book a Discovery Call
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default AIPackagesSection;