import { motion } from "framer-motion";
import { Search, BrainCircuit, Network, Hexagon, MessageSquareText, Lightbulb, Headphones } from "lucide-react";

const services = [
  {
    icon: Search,
    name: "SEO",
    description:
      "Search Engine Optimization strategies that boost organic rankings, drive qualified traffic, and maximize visibility across Google and beyond.",
  },
  {
    icon: MessageSquareText,
    name: "AEO",
    description:
      "Answer Engine Optimization for AI-powered search. We structure your content to be the definitive answer in ChatGPT, Perplexity, and voice assistants.",
  },
  {
    icon: BrainCircuit,
    name: "AI Agents",
    description:
      "Autonomous AI agents that handle complex workflows — from customer support and lead qualification to data analysis and task automation.",
  },
  {
    icon: Network,
    name: "AI Swarms",
    description:
      "Coordinated multi-agent systems where specialized AI models collaborate in real-time to solve problems no single agent can tackle alone.",
  },
  {
    icon: Hexagon,
    name: "AI Hives",
    description:
      "Persistent, self-organizing AI ecosystems that continuously learn, adapt, and optimize across your entire business infrastructure.",
  },
  {
    icon: Headphones,
    name: "Voice Concierge",
    description:
      "AI-powered voice concierge service that handles inbound calls, appointment booking, FAQ resolution, and warm handoffs — delivering 24/7 professional phone presence for your business.",
  },
  {
    icon: Lightbulb,
    name: "AI Consulting",
    description:
      "Strategic AI integration consulting for small businesses. We assess your workflows, identify high-impact automation opportunities, and deliver a roadmap to deploy AI tools that cut costs and scale operations.",
  },
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-primary font-display text-xs tracking-[0.3em] uppercase mb-4">
            What We Do
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Our <span className="gradient-text">Services</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From search dominance to autonomous AI systems — we build the technology that puts you ahead.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={service.name}
              className="glass-card rounded-xl p-8 flex flex-col items-start neon-border-hover transition-all duration-500 group"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors duration-300">
                <service.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-3">
                {service.name}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
