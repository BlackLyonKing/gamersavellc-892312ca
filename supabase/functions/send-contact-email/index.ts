const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const RECIPIENTS = ["robert@gamersave.llc", "brandon@gamersave.llc"];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRaw(to: string[], replyTo: string, subject: string, html: string): string {
  const boundary = "b_" + Math.random().toString(36).slice(2);
  const headers = [
    `To: ${to.join(", ")}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");
  const text = html.replace(/<[^>]+>/g, "").trim();
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
    html,
    `--${boundary}--`,
  ].join("\r\n");
  return toBase64Url(`${headers}\r\n\r\n${body}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!GOOGLE_MAIL_API_KEY) throw new Error("GOOGLE_MAIL_API_KEY is not configured");

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const message = String(body?.message ?? "").trim();

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || name.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || !emailRe.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!message || message.length > 5000) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `<!doctype html><html><body style="margin:0;background:#fff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
      <div style="max-width:560px;margin:0 auto;padding:24px">
        <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#00b386;margin:0 0 4px">Gamers Ave · Website Contact</p>
        <h1 style="font-size:22px;color:#111;margin:0 0 16px">New message from ${escapeHtml(name)}</h1>
        <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
          <tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px">Name</td><td style="padding:6px 0;color:#111;font-size:13px">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px">Email</td><td style="padding:6px 0;color:#111;font-size:13px">${escapeHtml(email)}</td></tr>
        </table>
        <h2 style="font-size:14px;color:#111;margin:0 0 4px">Message</h2>
        <p style="font-size:13px;color:#333;margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>
      </div>
    </body></html>`;

    const subject = `Website contact · ${name}`;
    const raw = buildRaw(RECIPIENTS, email, subject, html);

    const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });
    const resBody = await res.text();
    if (!res.ok) throw new Error(`Gmail send failed [${res.status}]: ${resBody}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("send-contact-email error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});