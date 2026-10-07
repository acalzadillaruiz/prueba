import type { NextRequest } from "next/server";
import { currentUser, handler, ok } from "@/server/api";
import { openTeamThread, requireAuditor } from "@/server/team-audit";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Read-only view of one team chat. Each call writes an AuditLog entry (privacy/compliance) and never changes the
 * participants' read state. Threads of other agencies answer 404.
 */
export const GET = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const { user, agencyId } = requireAuditor(await currentUser());
  const res = ok(await openTeamThread(agencyId, id, user));
  res.headers.set("cache-control", "no-store");
  return res;
});
