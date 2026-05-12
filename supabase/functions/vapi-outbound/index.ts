import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const phoneNumber = String(body?.phoneNumber ?? "").trim();
    const customerName = body?.customerName ? String(body.customerName).slice(0, 200) : undefined;
    const context = body?.context ? String(body.context).slice(0, 2000) : undefined;
    if (!/^\+?[1-9]\d{6,15}$/.test(phoneNumber.replace(/[\s()-]/g, ""))) {
      return new Response(JSON.stringify({ error: "invalid phone number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normalized = phoneNumber.startsWith("+") ? phoneNumber.replace(/[\s()-]/g, "") : `+1${phoneNumber.replace(/\D/g, "")}`;

    const VAPI_PRIVATE_KEY = Deno.env.get("VAPI_PRIVATE_KEY");
    const VAPI_ASSISTANT_ID = Deno.env.get("VAPI_ASSISTANT_ID");
    const VAPI_PHONE_NUMBER_ID = Deno.env.get("VAPI_PHONE_NUMBER_ID");
    if (!VAPI_PRIVATE_KEY || !VAPI_ASSISTANT_ID || !VAPI_PHONE_NUMBER_ID) {
      return new Response(JSON.stringify({ error: "Vapi not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vapiRes = await fetch("https://api.vapi.ai/call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_PRIVATE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: { number: normalized, ...(customerName ? { name: customerName } : {}) },
        ...(context ? { assistantOverrides: { variableValues: { context } } } : {}),
      }),
    });

    const vapiJson = await vapiRes.json();
    if (!vapiRes.ok) {
      console.error("Vapi error", vapiRes.status, vapiJson);
      return new Response(JSON.stringify({ error: vapiJson?.message ?? "Vapi request failed" }), {
        status: vapiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("vapi_call_logs").insert({
      call_id: vapiJson?.id ?? null,
      direction: "outbound",
      status: vapiJson?.status ?? "queued",
      to_number: normalized,
      assistant_id: VAPI_ASSISTANT_ID,
      initiated_by: user.id,
      metadata: { customerName, context, vapiResponse: vapiJson },
    });

    return new Response(JSON.stringify({ success: true, call: vapiJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vapi-outbound error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});