import type { NextRequest } from "next/server";
import { z } from "zod";
import { registerSchema } from "@newplace/config";
import { ApiError, body, handler, ok } from "@/server/api";
import { audit } from "@/server/data";
import { clientIp, limit, reset } from "@/server/rate-limit";
import { consumePasswordReset } from "@/server/password-reset";

// Same password rules as sign-up.
const Reset = z.object({ token: z.string().min(1).max(200), password: registerSchema.shape.password });

/** Sets a new password with the emailed token (single use). 422 { token: "invalid" } when it is unknown, used or expired. */
export const POST = handler(async (req: NextRequest) => {
  await limit(req, "pw-reset", 20, 15 * 60);
  const b = await body(req, Reset);
  const r = await consumePasswordReset(b.token, b.password);
  if (!r) throw new ApiError("VALIDATION", { token: "invalid" });
  // A fresh password clears the sign-in lockout counters for this account.
  await Promise.all([reset(`login-fail:${r.email}`), reset(`login-fail:${r.email}:${clientIp(req)}`)]);
  await audit(r.userId, "auth.password.reset", r.email);
  return ok({ ok: true, email: r.email });
});
