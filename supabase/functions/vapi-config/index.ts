import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Returns Vapi values that are safe for the browser (public key + assistant id).
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(
    JSON.stringify({
      publicKey: Deno.env.get("VAPI_PUBLIC_KEY") ?? null,
      assistantId: Deno.env.get("VAPI_ASSISTANT_ID") ?? null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});