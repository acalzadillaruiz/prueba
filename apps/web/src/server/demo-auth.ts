import { prisma } from "@newplace/db";
import { isDemoEmail } from "@/lib/demo";
import { gatePassed } from "@/lib/site-gate";

/**
 * DEMO_AUTH password-less login: resolves the seeded demo account to sign in as, or null.
 * - Only the fixed seeded demo accounts, never arbitrary/registered users.
 * - While the private preview gate is on (SITE_ACCESS_CODE), the request must carry the gate cookie as well, so the
 *   demo login can't be used from outside the preview (defense in depth on top of the middleware's /api gate).
 */
export async function demoUserId(raw: unknown, request: { headers: Headers }): Promise<string | null> {
  if (!(await gatePassed(request))) return null;
  const email = String((raw as { email?: unknown })?.email ?? "").trim().toLowerCase();
  if (!isDemoEmail(email)) return null;
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}
