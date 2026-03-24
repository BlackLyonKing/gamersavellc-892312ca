import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectDescription } = await req.json();
    if (!projectDescription) {
      return new Response(JSON.stringify({ error: "Project description is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a senior software project estimator for Gamers Ave LLC, a Web3/Software development agency. Given a project description, produce a detailed cost estimate.

IMPORTANT: Return ONLY valid JSON matching the tool schema. No markdown, no explanations outside the tool call.

Consider these cost factors:
1. **Development Hours**: Break down by frontend, backend, smart contracts, AI integration, testing, deployment
2. **AI Credit Usage**: Estimate monthly AI API costs (Gemini/GPT calls, embeddings, fine-tuning if needed)
3. **Server & Hosting**: Cloud infrastructure, CDN, database hosting, IPFS/blockchain nodes
4. **Third-party Services**: Domain, SSL, monitoring, analytics, payment processors
5. **Blockchain Costs**: Gas fees, contract deployment, auditing if Web3
6. **Maintenance**: Monthly ongoing costs post-launch

Use these hourly rates:
- Frontend Development: $125/hr
- Backend Development: $150/hr
- Smart Contract Development: $200/hr
- AI/ML Integration: $175/hr
- UI/UX Design: $100/hr
- QA & Testing: $90/hr
- DevOps & Deployment: $130/hr
- Project Management: $110/hr

Provide realistic estimates. Include a complexity score (1-10) and confidence level.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a detailed cost estimate for this project:\n\n${projectDescription}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_quote",
              description: "Generate a structured project cost estimate",
              parameters: {
                type: "object",
                properties: {
                  projectName: { type: "string", description: "Suggested project name" },
                  summary: { type: "string", description: "Brief project summary (2-3 sentences)" },
                  complexityScore: { type: "number", description: "1-10 complexity rating" },
                  confidenceLevel: { type: "string", enum: ["low", "medium", "high"], description: "Estimate confidence" },
                  estimatedTimeline: { type: "string", description: "Estimated development timeline (e.g., '6-8 weeks')" },
                  developmentBreakdown: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        hours: { type: "number" },
                        rate: { type: "number" },
                        subtotal: { type: "number" },
                        notes: { type: "string" },
                      },
                      required: ["category", "hours", "rate", "subtotal"],
                    },
                  },
                  monthlyCosts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        monthlyCost: { type: "number" },
                        notes: { type: "string" },
                      },
                      required: ["item", "monthlyCost"],
                    },
                  },
                  oneTimeCosts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item: { type: "string" },
                        cost: { type: "number" },
                        notes: { type: "string" },
                      },
                      required: ["item", "cost"],
                    },
                  },
                  totalDevelopmentCost: { type: "number" },
                  totalMonthlyCost: { type: "number" },
                  totalOneTimeCost: { type: "number" },
                  grandTotal: { type: "number", description: "Total development + one-time costs" },
                  techStack: { type: "array", items: { type: "string" } },
                  risks: { type: "array", items: { type: "string" } },
                  recommendations: { type: "array", items: { type: "string" } },
                },
                required: [
                  "projectName", "summary", "complexityScore", "confidenceLevel",
                  "estimatedTimeline", "developmentBreakdown", "monthlyCosts",
                  "oneTimeCosts", "totalDevelopmentCost", "totalMonthlyCost",
                  "totalOneTimeCost", "grandTotal", "techStack", "risks", "recommendations",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_quote" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const quote = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ quote }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Quote generation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
