import type { NextRequest } from "next/server";
import { currentUser, handler, ok } from "@/server/api";
import { advisorPerformance, requireAuditor } from "@/server/team-audit";
import { toPeriod } from "@/lib/team-metrics";

/** Per-advisor performance of the caller's agency (owner / impersonating superadmin only). ?days=30|90|365 */
export const GET = handler(async (req: NextRequest) => {
  const { agencyId } = requireAuditor(await currentUser());
  const days = toPeriod(req.nextUrl.searchParams.get("days"));
  return ok({ days, items: await advisorPerformance(agencyId, days) });
});
