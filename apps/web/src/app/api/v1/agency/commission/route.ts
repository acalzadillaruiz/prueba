import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { requireAgency } from "@/server/access";
import { audit } from "@/server/data";

const Rule = z.object({ salePct: z.number().min(0).max(20), agentSplitPct: z.number().min(0).max(100), rentMonths: z.number().min(0).max(3), captorPct: z.number().min(0).max(50) });

export const PUT = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (u.role !== "AGENCY_OWNER" && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const agencyId = requireAgency(u);
  const b = await body(req, Rule);
  const r = await prisma.commissionRule.upsert({ where: { agencyId }, create: { agencyId, ...b }, update: b });
  await audit(u.id, "commission.rule", `${b.salePct} % · split ${b.agentSplitPct} %`);
  return ok(r);
});
