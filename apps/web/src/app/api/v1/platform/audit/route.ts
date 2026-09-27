import type { NextRequest } from "next/server";
import { ApiError, currentUser, handler, ok, requireUser } from "@/server/api";
import { auditPage } from "@/server/audit-log";

/** Superadmin: paginated audit log. ?cursor=&action=<prefix>&actor=<userId|system>&take= */
export const GET = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const p = req.nextUrl.searchParams;
  const take = Number(p.get("take") ?? 50);
  return ok(await auditPage({ cursor: p.get("cursor"), action: p.get("action"), actorId: p.get("actor"), take: Number.isFinite(take) ? take : 50 }));
});
