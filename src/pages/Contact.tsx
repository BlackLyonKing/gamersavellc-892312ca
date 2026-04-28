import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  message: z.string().trim().min(1, "Message is required").max(5000),
});

const Contact = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const mountedAt = useRef<number>(Date.now());
  const lastSubmitAt = useRef<number>(0);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side throttle: 30s between submissions
    const now = Date.now();
    if (now - lastSubmitAt.current < 30_000) {
      toast({
        title: "Please wait",
        description: "You can send another message in a few seconds.",
        variant: "destructive",
      });
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Please check the form",
        description: parsed.error.issues[0]?.message ?? "Invalid input",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          ...parsed.data,
          website, // honeypot — must be empty
          elapsedMs: now - mountedAt.current,
        },
      });
      if (error) throw error;
      lastSubmitAt.current = now;
      toast({
        title: "Message sent",
        description: "Thanks - Gamers Ave support will get back to you shortly.",
      });
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      toast({
        title: "Failed to send",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-display tracking-wider uppercase transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <img src={logo} alt="Gamers Ave LLC" className="w-20 mx-auto mb-6 object-contain" />
          <p className="text-primary font-display text-xs tracking-[0.3em] uppercase mb-3">
            Get In Touch
          </p>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-3">
            Contact <span className="gradient-text">Us</span>
          </h1>
          <p className="text-muted-foreground">
            Send a message directly to our team. We typically respond within one business day.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-xl border border-primary/20 bg-card/60 backdrop-blur p-6 md:p-8 space-y-5 shadow-[0_0_40px_hsl(160_100%_45%/0.08)]"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your full name"
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
              maxLength={255}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Tell us about your project, timeline, and goals…"
              rows={7}
              maxLength={5000}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 font-display tracking-wider uppercase text-sm"
          >
            {submitting ? "Sending…" : "Send Message"}
          </Button>
        </motion.form>
      </div>
    </div>
  );
};

export default Contact;