import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, DollarSign, Clock, Zap, AlertTriangle, Lightbulb, ArrowLeft, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface DevBreakdown {
  category: string;
  hours: number;
  rate: number;
  subtotal: number;
  notes?: string;
}

interface MonthlyCost {
  item: string;
  monthlyCost: number;
  notes?: string;
}

interface OneTimeCost {
  item: string;
  cost: number;
  notes?: string;
}

interface Quote {
  projectName: string;
  summary: string;
  complexityScore: number;
  confidenceLevel: string;
  estimatedTimeline: string;
  developmentBreakdown: DevBreakdown[];
  monthlyCosts: MonthlyCost[];
  oneTimeCosts: OneTimeCost[];
  totalDevelopmentCost: number;
  totalMonthlyCost: number;
  totalOneTimeCost: number;
  grandTotal: number;
  techStack: string[];
  risks: string[];
  recommendations: string[];
}

const QuoteTool = () => {
  const [prompt, setPrompt] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateQuote = async () => {
    if (!prompt.trim()) {
      toast({ title: "Enter a project description", variant: "destructive" });
      return;
    }
    setLoading(true);
    setQuote(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quote", {
        body: { projectDescription: prompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setQuote(data.quote);
    } catch (e: any) {
      toast({ title: "Error generating quote", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyQuote = () => {
    if (!quote) return;
    const text = `PROJECT QUOTE: ${quote.projectName}
${quote.summary}

Timeline: ${quote.estimatedTimeline}
Complexity: ${quote.complexityScore}/10

DEVELOPMENT BREAKDOWN:
${quote.developmentBreakdown.map((d) => `  ${d.category}: ${d.hours}hrs × $${d.rate}/hr = $${d.subtotal.toLocaleString()}`).join("\n")}

MONTHLY COSTS:
${quote.monthlyCosts.map((m) => `  ${m.item}: $${m.monthlyCost.toLocaleString()}/mo`).join("\n")}

ONE-TIME COSTS:
${quote.oneTimeCosts.map((o) => `  ${o.item}: $${o.cost.toLocaleString()}`).join("\n")}

TOTALS:
  Development: $${quote.totalDevelopmentCost.toLocaleString()}
  Monthly: $${quote.totalMonthlyCost.toLocaleString()}/mo
  One-time: $${quote.totalOneTimeCost.toLocaleString()}
  GRAND TOTAL: $${quote.grandTotal.toLocaleString()}

Tech Stack: ${quote.techStack.join(", ")}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Quote copied to clipboard" });
  };

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">Auto Quote Generator</h1>
              <p className="text-xs text-muted-foreground">Internal Tool — Gamers Ave LLC</p>
            </div>
          </div>
          {quote && (
            <Button onClick={copyQuote} variant="outline" size="sm" className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy Quote"}
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Input */}
        <Card className="glass-card neon-border mb-8">
          <CardContent className="p-6">
            <label className="font-display text-sm font-semibold text-foreground mb-3 block">
              Describe the project
            </label>
            <Textarea
              placeholder="e.g. Build a DeFi lending platform with wallet connect, smart contracts for lending pools, admin dashboard, real-time analytics, and mobile-responsive UI..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] bg-background/80 border-border mb-4 text-foreground"
              disabled={loading}
            />
            <Button
              onClick={generateQuote}
              disabled={loading || !prompt.trim()}
              className="w-full sm:w-auto gap-2 font-display text-sm tracking-wider uppercase"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {loading ? "Analyzing Project..." : "Generate Quote"}
            </Button>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground font-display text-sm">AI is analyzing project scope, tech requirements, and costs...</p>
          </motion.div>
        )}

        {/* Results */}
        <AnimatePresence>
          {quote && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="glass-card neon-border">
                  <CardContent className="p-5 text-center">
                    <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-display font-bold text-foreground">{fmt(quote.grandTotal)}</p>
                    <p className="text-xs text-muted-foreground">Grand Total</p>
                  </CardContent>
                </Card>
                <Card className="glass-card neon-border">
                  <CardContent className="p-5 text-center">
                    <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-display font-bold text-foreground">{quote.estimatedTimeline}</p>
                    <p className="text-xs text-muted-foreground">Timeline</p>
                  </CardContent>
                </Card>
                <Card className="glass-card neon-border">
                  <CardContent className="p-5 text-center">
                    <Zap className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-display font-bold text-foreground">{quote.complexityScore}/10</p>
                    <p className="text-xs text-muted-foreground">Complexity</p>
                    <Progress value={quote.complexityScore * 10} className="mt-2 h-2" />
                  </CardContent>
                </Card>
                <Card className="glass-card neon-border">
                  <CardContent className="p-5 text-center">
                    <DollarSign className="h-6 w-6 text-accent mx-auto mb-2" />
                    <p className="text-2xl font-display font-bold text-foreground">{fmt(quote.totalMonthlyCost)}</p>
                    <p className="text-xs text-muted-foreground">Monthly Costs</p>
                  </CardContent>
                </Card>
              </div>

              {/* Project Info */}
              <Card className="glass-card neon-border mb-6">
                <CardHeader>
                  <CardTitle className="font-display text-lg">{quote.projectName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{quote.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      Confidence: {quote.confidenceLevel}
                    </Badge>
                    {quote.techStack.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dev Breakdown */}
              <Card className="glass-card neon-border mb-6">
                <CardHeader><CardTitle className="font-display text-lg">Development Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-3 pr-4">Category</th>
                          <th className="text-right py-3 px-4">Hours</th>
                          <th className="text-right py-3 px-4">Rate</th>
                          <th className="text-right py-3 pl-4">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.developmentBreakdown.map((d, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-3 pr-4 font-medium text-foreground">{d.category}
                              {d.notes && <p className="text-xs text-muted-foreground mt-1">{d.notes}</p>}
                            </td>
                            <td className="text-right py-3 px-4 text-muted-foreground">{d.hours}h</td>
                            <td className="text-right py-3 px-4 text-muted-foreground">{fmt(d.rate)}/hr</td>
                            <td className="text-right py-3 pl-4 font-semibold text-foreground">{fmt(d.subtotal)}</td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td className="py-3 text-foreground" colSpan={3}>Total Development</td>
                          <td className="text-right py-3 text-primary">{fmt(quote.totalDevelopmentCost)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly + One-time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card className="glass-card neon-border">
                  <CardHeader><CardTitle className="font-display text-base">Monthly Recurring</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {quote.monthlyCosts.map((m, i) => (
                      <div key={i} className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-foreground">{m.item}</p>
                          {m.notes && <p className="text-xs text-muted-foreground">{m.notes}</p>}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{fmt(m.monthlyCost)}/mo</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-3 flex justify-between font-bold">
                      <span className="text-foreground">Total Monthly</span>
                      <span className="text-primary">{fmt(quote.totalMonthlyCost)}/mo</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card neon-border">
                  <CardHeader><CardTitle className="font-display text-base">One-Time Costs</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {quote.oneTimeCosts.map((o, i) => (
                      <div key={i} className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-foreground">{o.item}</p>
                          {o.notes && <p className="text-xs text-muted-foreground">{o.notes}</p>}
                        </div>
                        <span className="text-sm font-semibold text-foreground">{fmt(o.cost)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-3 flex justify-between font-bold">
                      <span className="text-foreground">Total One-Time</span>
                      <span className="text-primary">{fmt(quote.totalOneTimeCost)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Risks & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card neon-border">
                  <CardHeader>
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" /> Risks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {quote.risks.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-destructive mt-1">•</span>{r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card className="glass-card neon-border">
                  <CardHeader>
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" /> Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {quote.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary mt-1">•</span>{r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuoteTool;
