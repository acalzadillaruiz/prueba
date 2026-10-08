import type { NextRequest } from "next/server";
import { z } from "zod";
import { body, handler, ok } from "@/server/api";
import { queueEmail } from "@/server/data";
import { hit, limit } from "@/server/rate-limit";
import { requestLocale } from "@/server/email-locale";
import { createPasswordReset, resetPath } from "@/server/password-reset";

const Forgot = z.object({ email: z.string().trim().email().max(254), locale: z.enum(["es", "en"]).optional() });

/** Per-email budget applies where the per-IP limits do (production, or RATE_LIMIT=on). */
const perEmailOn = () => process.env.NODE_ENV === "production" || process.env.RATE_LIMIT === "on";

/**
 * "¿Olvidaste tu contraseña?": emails a single-use 30-minute link. The answer is always the same 200, whether or not
 * the address has an account (or its per-email budget is spent), so it can't be used to find out who is registered.
 */
export const POST = handler(async (req: NextRequest) => {
  await limit(req, "pw-forgot", 10, 15 * 60);
  const b = await body(req, Forgot);
  const email = b.email.toLowerCase();
  const loc = b.locale ?? requestLocale(req);
  // 3 links per address per hour: nobody can flood someone's inbox through us.
  if (!perEmailOn() || (await hit(`pw-forgot:${email}`, 3, 60 * 60))) {
    const r = await createPasswordReset(email);
    if (r) await queueEmail(email, loc === "en" ? "Choose a new password (link valid for 30 minutes)" : "Elige una nueva contraseña (el enlace vale 30 minutos)", "RESET", resetPath(loc, r.token));
  }
  return ok({ ok: true });
});
