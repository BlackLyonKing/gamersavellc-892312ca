import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Optional shared-secret verification — set X-Vapi-Secret in Vapi dashboard to VAPI_PRIVATE_KEY value
    const expected = Deno.env.get("VAPI_PRIVATE_KEY");
    const provided = req.headers.get("x-vapi-secret");
    if (expected && provided && provided !== expected) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const msg = payload?.message ?? payload;
    const type: string = msg?.type ?? "unknown";
    const call = msg?.call ?? {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Handle assistant-request: tell Vapi which assistant to use for inbound calls
    if (type === "assistant-request") {
      const assistantId = Deno.env.get("VAPI_ASSISTANT_ID");
      return new Response(
        JSON.stringify(assistantId ? { assistantId } : { error: "no assistant configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Persist call data on end-of-call-report or status updates
    if (type === "end-of-call-report" || type === "status-update" || type === "call.ended") {
      const callId = call?.id;
      if (callId) {
        const direction = call?.type === "outboundPhoneCall"
          ? "outbound"
          : call?.type === "inboundPhoneCall"
            ? "inbound"
            : "web";

        const row = {
          call_id: callId,
          direction,
          status: call?.status ?? msg?.status ?? null,
          from_number: call?.customer?.number ?? call?.phoneNumber?.number ?? null,
          to_number: call?.phoneNumber?.number ?? call?.customer?.number ?? null,
          assistant_id: call?.assistantId ?? null,
          duration_seconds: msg?.durationSeconds ?? null,
          cost: msg?.cost ?? null,
          transcript: msg?.transcript ?? null,
          summary: msg?.summary ?? msg?.analysis?.summary ?? null,
          recording_url: msg?.recordingUrl ?? msg?.stereoRecordingUrl ?? null,
          ended_reason: msg?.endedReason ?? null,
          metadata: msg ?? null,
          started_at: call?.startedAt ?? null,
          ended_at: call?.endedAt ?? null,
        };

        await supabase.from("vapi_call_logs").upsert(row, { onConflict: "call_id" });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vapi-webhook error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});