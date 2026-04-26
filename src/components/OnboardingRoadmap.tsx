import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, FileText, Rocket, UserPlus, CalendarCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type OnboardingStatus = "in_progress" | "submitted" | "call_scheduled" | "completed";

interface RoadmapProps {
  status: OnboardingStatus;
  confirmedCallAt?: string | null;
}

type StepState = "done" | "current" | "pending";

const OnboardingRoadmap = ({ status, confirmedCallAt }: RoadmapProps) => {
  const intakeState: StepState =
    status === "submitted" || status === "call_scheduled" || status === "completed" ? "done" : "current";
  const callState: StepState =
    status === "completed" ? "done"
      : status === "call_scheduled" ? "current"
      : status === "submitted" ? "current"
      : "pending";
  const proposalState: StepState = status === "completed" ? "done" : "pending";

  const steps: Array<{ key: string; icon: typeof CheckCircle2; title: string; desc: string; state: StepState }> = [
    { key: "account", icon: UserPlus, title: "Account created", desc: "You're in.", state: "done" },
    { key: "intake", icon: FileText, title: "Intake submitted", desc: "Your info is with our team.", state: intakeState },
    {
      key: "call", icon: CalendarCheck, title: "Discovery call",
      desc: confirmedCallAt
        ? `Confirmed for ${new Date(confirmedCallAt).toLocaleString()}`
        : status === "submitted" ? "We'll confirm a slot within 1 business day." : "Awaiting intake.",
      state: callState,
    },
    { key: "proposal", icon: FileText, title: "Proposal & contract", desc: "Custom scope, pricing, and timeline.", state: proposalState },
    { key: "kickoff", icon: Rocket, title: "Kickoff", desc: "Your project goes live.", state: "pending" },
  ];

  const statusStyles = (s: "done" | "current" | "pending") => {
    if (s === "done") return "bg-primary border-primary text-primary-foreground";
    if (s === "current") return "border-primary text-primary bg-primary/10 animate-pulse";
    return "border-border text-muted-foreground";
  };

  return (
    <Card className="glass-card neon-border mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">Your onboarding roadmap</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Here's what happens next.</p>
          </div>
          <span className="text-[10px] font-display tracking-[0.2em] uppercase text-primary">
            {status === "in_progress" && "In Progress"}
            {status === "submitted" && "Awaiting Call"}
            {status === "call_scheduled" && "Call Scheduled"}
            {status === "completed" && "Onboarded"}
          </span>
        </div>

        <div className="space-y-3">
          {steps.map((s, i) => {
            const Icon = s.state === "done" ? CheckCircle2 : s.state === "current" ? Clock : Circle;
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${statusStyles(s.state)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-display text-sm ${s.state === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OnboardingRoadmap;