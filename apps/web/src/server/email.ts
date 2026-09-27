import "server-only";

/**
 * Transactional email delivery. With RESEND_API_KEY + EMAIL_FROM set, mails go out through Resend's HTTP API
 * (no SDK needed); otherwise delivery is simulated and the outbox row is the record (dev / demo).
 */
export type Delivery = { status: "SENT" | "FAILED"; error?: string };

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "")).replace(/\/$/, "");

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function html(subject: string, body: string) {
  // `body` may be a relative app link (e.g. an invitation) or plain text.
  // Only a clean same-app path becomes a button: free text that merely starts with "/" (e.g. an agent's reply)
  // stays text, and `//host`, `/\\host` or whitespace tricks can never turn it into a link to another site.
  const link = /^\/(es|en)\/[^\s\\]*$/.test(body) && !body.startsWith("//") && APP_URL ? `${APP_URL}${body}` : null;
  return `<!doctype html><html><body style="margin:0;background:#F7F4EF;font-family:system-ui,sans-serif;color:#111827">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<div style="font-weight:700;font-size:20px;color:#0B1220">New Place</div>
<h1 style="font-size:22px;line-height:1.3;margin:24px 0 12px">${esc(subject)}</h1>
${link ? `<p><a href="${esc(link)}" style="display:inline-block;background:#C2452A;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">Abrir en New Place</a></p>` : body ? `<p style="font-size:15px;line-height:1.5">${esc(body)}</p>` : ""}
<p style="margin-top:32px;font-size:12px;color:#6b7280">New Place · Un nuevo lugar.</p>
</div></body></html>`;
}

export async function deliver(to: string, subject: string, body: string): Promise<Delivery> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { status: "SENT" }; // simulated (no provider configured)
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html: html(subject, body) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { status: "FAILED", error: `Resend ${r.status}` };
    return { status: "SENT" };
  } catch (e) {
    return { status: "FAILED", error: (e as Error).message };
  }
}
