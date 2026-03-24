import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const ContactSection = () => {
  return (
    <section id="contact" className="py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-primary font-display text-xs tracking-[0.3em] uppercase mb-4">
            Let's Build Together
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6">
            Ready to <span className="gradient-text">Launch</span>?
          </h2>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
            Whether you need a custom web app, blockchain integration, AI-powered tools, or a stunning brand website — Gamers Ave LLC delivers production-ready solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:brandon@glennglobal.llc"
              className="inline-block px-10 py-4 rounded-lg bg-primary text-primary-foreground font-display text-sm tracking-wider uppercase font-semibold hover:shadow-[0_0_40px_hsl(160_100%_45%/0.4)] transition-all duration-300"
            >
              Start a Project
            </a>
            <Link
              to="/auth"
              className="inline-block px-10 py-4 rounded-lg border border-primary/30 text-primary font-display text-sm tracking-wider uppercase font-semibold hover:bg-primary/10 transition-all duration-300"
            >
              Client Portal
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ContactSection;
