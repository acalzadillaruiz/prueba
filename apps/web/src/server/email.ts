import "server-only";
import { resolveSiteUrl } from "@/lib/seo";

/**
 * Transactional email delivery. With RESEND_API_KEY + EMAIL_FROM set, mails go out through Resend's HTTP API
 * (no SDK needed); otherwise delivery is simulated and the outbox row is the record (dev / demo).
 */
export type Delivery = { status: "SENT" | "SIMULATED" | "FAILED"; error?: string };

// Same origin resolution as canonical URLs (APP_URL → NEXT_PUBLIC_APP_URL → Vercel); no localhost links in real mail.
const APP_URL = (({ url, fallback }) => (fallback ? "" : url))(resolveSiteUrl());

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function html(subject: string, body: string) {
  // `body` may be a relative app link (e.g. an invitation) or plain text.
  // Only a clean same-app path becomes a button: free text that merely starts with "/" (e.g. an agent's reply)
  // stays text, and `//host`, `/\\host` or whitespace tricks can never turn it into a link to another site.
  // The email-verification link (/api/v1/auth/verify?token=<base64url>.<base64url>) is the only API path allowed.
  const appPath = /^\/(es|en)\/[^\s\\]*$/.test(body) || /^\/api\/v1\/auth\/verify\?token=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(body);
  const link = appPath && !body.startsWith("//") && APP_URL ? `${APP_URL}${body}` : null;
  // Brand v4 (Cal background, navy header, one terracotta action). Table layout + inline styles for mail clients;
  // brand fonts are named first and fall back to Georgia/Arial (no external stylesheet: the only href is the CTA).
  const sans = "Manrope,'Helvetica Neue',Arial,sans-serif";
  const serif = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
  const content = link
    ? `<tr><td style="padding:8px 40px 8px"><a href="${esc(link)}" style="display:inline-block;background:#8E3B22;color:#ffffff;padding:14px 28px;border-radius:999px;text-decoration:none;font-family:${sans};font-size:15px;font-weight:600;letter-spacing:.01em">Abrir en New Place</a></td></tr>`
    : body
      ? `<tr><td style="padding:0 40px 8px;font-family:${sans};font-size:15px;line-height:1.6;color:#1F2328">${esc(body)}</td></tr>`
      : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#EEF0F2;color:#1F2328;-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF0F2"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(31,35,40,.06)">
<tr><td align="center" style="background:#1F2328;padding:28px 24px 24px">
<div style="font-family:${serif};font-size:22px;letter-spacing:.32em;color:#EEF0F2;padding-left:.32em">NEW PLACE</div>
<div style="margin:8px auto 0;width:44px;height:2px;background:#C3C8CD;line-height:2px;font-size:0">&nbsp;</div>
<div style="margin-top:8px;font-family:${sans};font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:#A8B0B8;padding-left:.34em">Bienes raíces</div>
</td></tr>
<tr><td style="padding:36px 40px 12px"><h1 style="margin:0;font-family:${serif};font-weight:500;font-size:30px;line-height:1.15;color:#1F2328">${esc(subject)}</h1></td></tr>
${content}
<tr><td style="padding:28px 40px 32px"><div style="border-top:1px solid #E0E3E6;padding-top:16px;font-family:${sans};font-size:12px;line-height:1.5;color:#4B525A">New Place · Bienes raíces · El Caribe, con alma mediterránea. Cuando quieras, aquí estamos.</div></td></tr>
</table>
</td></tr></table></body></html>`;
}

/** True when real delivery is configured (Resend key + sender). Without it mails are only recorded (SIMULATED). */
export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function deliver(to: string, subject: string, body: string): Promise<Delivery> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { status: "SIMULATED" }; // no provider configured: recorded, never delivered
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
