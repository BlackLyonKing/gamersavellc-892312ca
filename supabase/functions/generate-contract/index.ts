import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectTitle, projectDescription, clientName, companyName, quotedAmount, techStack, estimatedTimeline } = await req.json();

    if (!projectTitle || !projectDescription) {
      return new Response(JSON.stringify({ error: "Project title and description are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a legal contract generator for Gamers Ave LLC, a Web3/AI software development agency.

Generate a professional, legally-sound service agreement based on the project scope provided. The contract should be comprehensive and cover all potential fee categories.

Use these hourly rates (small business standard):
- Frontend Development: $125/hr
- Backend Development: $150/hr
- Smart Contract Development: $200/hr
- AI/ML Integration: $175/hr
- UI/UX Design: $100/hr
- QA & Testing: $90/hr
- DevOps & Deployment: $130/hr
- Project Management: $110/hr

Include these fee categories where applicable:
1. Development fees (broken down by discipline)
2. Hosting/infrastructure fees ($50-500/mo depending on scale)
3. AI token/credit usage fees ($25-200/mo estimated)
4. Domain, SSL, third-party service fees
5. Maintenance/retainer fees ($500-5,000/mo)
6. Blockchain/gas fees (if Web3 project)
7. Rush/expedite fees (1.5x standard rate)
8. Revision/change order fees (billed hourly after 2 included rounds)
9. Cancellation/early termination fees (25% of remaining contract value)
10. Late payment fees (1.5% monthly)

The contract must include:
- Parties and effective date
- Scope of work
- Detailed fee schedule with all applicable categories
- Payment terms (50% deposit, milestones, net-30)
- Intellectual property assignment upon full payment
- Confidentiality clause
- Warranty (30-day bug fix period)
- Limitation of liability
- Termination clause
- Dispute resolution (binding arbitration)
- Force majeure
- Governing law

IMPORTANT: Return ONLY valid JSON matching the tool schema.`;

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
          {
            role: "user",
            content: `Generate a contract for this project:

Project: ${projectTitle}
Description: ${projectDescription}
Client: ${clientName || "TBD"}
Company: ${companyName || "N/A"}
Quoted Amount: ${quotedAmount ? `$${quotedAmount}` : "To be determined"}
Tech Stack: ${techStack?.join(", ") || "TBD"}
Timeline: ${estimatedTimeline || "TBD"}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_contract",
              description: "Generate a structured service agreement",
              parameters: {
                type: "object",
                properties: {
                  contractTitle: { type: "string", description: "Contract title" },
                  effectiveDate: { type: "string", description: "Today's date in YYYY-MM-DD format" },
                  scopeSummary: { type: "string", description: "2-3 sentence scope summary" },
                  feeBreakdown: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        type: { type: "string", enum: ["one_time", "monthly", "hourly", "milestone"] },
                        amount: { type: "number" },
                        description: { type: "string" },
                        hours: { type: "number" },
                        rate: { type: "number" },
                      },
                      required: ["category", "type", "amount", "description"],
                    },
                  },
                  totalOneTime: { type: "number", description: "Total one-time fees" },
                  totalMonthly: { type: "number", description: "Total monthly recurring fees" },
                  grandTotal: { type: "number", description: "Total one-time amount" },
                  paymentSchedule: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        milestone: { type: "string" },
                        percentage: { type: "number" },
                        amount: { type: "number" },
                        dueDate: { type: "string" },
                      },
                      required: ["milestone", "percentage", "amount"],
                    },
                  },
                  fullContractText: { type: "string", description: "The complete legal contract text with all clauses, formatted with section numbers" },
                  keyTerms: {
                    type: "array",
                    items: { type: "string" },
                    description: "Bullet-point summary of key terms for quick review",
                  },
                },
                required: [
                  "contractTitle", "effectiveDate", "scopeSummary", "feeBreakdown",
                  "totalOneTime", "totalMonthly", "grandTotal", "paymentSchedule",
                  "fullContractText", "keyTerms",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_contract" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const contract = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ contract }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Contract generation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
