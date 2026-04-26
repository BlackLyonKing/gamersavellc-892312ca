import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

interface OnboardingPayload {
  client_name?: string;
  client_email?: string;
  company_name?: string;
  industry?: string;
  package_interest?: string;
  budget_range?: string;
  timeline?: string;
  primary_goal?: string;
  pain_points?: string;
  project_summary?: string;
  preferred_slots?: string[];
  timezone?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtSlot(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function buildHtml(p: OnboardingPayload): string {
  const slots = (p.preferred_slots ?? []).map(fmtSlot);
  const slotList = slots.length
    ? `<ul style="margin:8px 0 0 0;padding-left:20px;color:#111">${slots
        .map((s) => `<li>${escapeHtml(s)}</li>`)
        .join("")}</ul>`
    : '<p style="color:#666;margin:8px 0 0">No slots provided.</p>';

  const row = (label: string, value?: string) =>
    value
      ? `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;vertical-align:top">${label}</td><td style="padding:6px 0;color:#111;font-size:13px">${escapeHtml(value)}</td></tr>`
      : "";

  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#00b386;margin:0 0 4px">Gamers Ave · Onboarding</p>
      <h1 style="font-size:22px;color:#111;margin:0 0 4px">New client proposed discovery slots</h1>
      <p style="font-size:13px;color:#666;margin:0 0 20px">A client just submitted onboarding and proposed times for the discovery call.</p>

      <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
        ${row("Client", p.client_name)}
        ${row("Email", p.client_email)}
        ${row("Company", p.company_name)}
        ${row("Industry", p.industry)}
        ${row("Package", p.package_interest)}
        ${row("Budget", p.budget_range)}
        ${row("Timeline", p.timeline)}
        ${row("Timezone", p.timezone)}
      </table>

      <h2 style="font-size:14px;color:#111;margin:0 0 4px">Proposed slots</h2>
      ${slotList}

      ${
        p.project_summary
          ? `<h2 style="font-size:14px;color:#111;margin:20px 0 4px">Project summary</h2><p style="font-size:13px;color:#333;margin:0;white-space:pre-wrap">${escapeHtml(p.project_summary)}</p>`
          : ""
      }
      ${
        p.primary_goal
          ? `<h2 style="font-size:14px;color:#111;margin:20px 0 4px">Primary goal</h2><p style="font-size:13px;color:#333;margin:0;white-space:pre-wrap">${escapeHtml(p.primary_goal)}</p>`
          : ""
      }
      ${
        p.pain_points
          ? `<h2 style="font-size:14px;color:#111;margin:20px 0 4px">Pain points</h2><p style="font-size:13px;color:#333;margin:0;white-space:pre-wrap">${escapeHtml(p.pain_points)}</p>`
          : ""
      }

      <p style="margin:28px 0 0;font-size:12px;color:#999">Open the admin dashboard to confirm a slot.</p>
    </div>
  </body></html>`;
}

function toBase64Url(input: string): string {
  // Encode UTF-8 safely
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRawEmail(opts: {
  to: string[];
  subject: string;
  html: string;
}): string {
  const boundary = "b_" + Math.random().toString(36).slice(2);
  const headers = [
    `To: ${opts.to.join(", ")}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");

  const text = opts.html.replace(/<[^>]+>/g, "").trim();

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    opts.html,
    `--${boundary}--`,
  ].join("\r\n");

  return toBase64Url(`${headers}\r\n\r\n${body}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!GOOGLE_MAIL_API_KEY) throw new Error("GOOGLE_MAIL_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase env vars missing");
    }

    // Validate caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as OnboardingPayload;

    // Fetch admin emails using service role (bypasses RLS, safe — internal)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: admins, error: adminErr } = await adminClient.rpc("get_admin_emails");
    if (adminErr) throw new Error(`Failed to fetch admins: ${adminErr.message}`);

    const recipients = (admins ?? [])
      .map((r: { email: string }) => r.email)
      .filter(Boolean);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, note: "No admin recipients" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const html = buildHtml(payload);
    const subject = `New onboarding · ${payload.company_name || payload.client_name || "Client"} proposed call slots`;
    const raw = buildRawEmail({ to: recipients, subject, html });

    const gmailRes = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    const gmailBody = await gmailRes.text();
    if (!gmailRes.ok) {
      throw new Error(`Gmail send failed [${gmailRes.status}]: ${gmailBody}`);
    }

    return new Response(
      JSON.stringify({ ok: true, sent: recipients.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("notify-admins-onboarding error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});