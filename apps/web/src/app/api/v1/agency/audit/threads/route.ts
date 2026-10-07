import type { NextRequest } from "next/server";
import { currentUser, handler, ok } from "@/server/api";
import { requireAuditor, teamThreads } from "@/server/team-audit";

/** Team chats of the caller's agency (summaries only; opening one is logged). ?agentId= narrows to one advisor. */
export const GET = handler(async (req: NextRequest) => {
  const { agencyId } = requireAuditor(await currentUser());
  const agentId = req.nextUrl.searchParams.get("agentId")?.trim() || null;
  return ok({ items: await teamThreads(agencyId, { agentId }) });
});
