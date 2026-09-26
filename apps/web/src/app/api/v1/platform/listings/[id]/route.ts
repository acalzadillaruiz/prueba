import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit } from "@/server/data";

type Ctx = { params: Promise<{ id: string }> };

/** Moderation takedown / restore (superadmin). */
export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  if (u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ takedown: z.boolean(), reason: z.string().max(200).optional() }));
  const l = await prisma.listing.findUnique({ where: { id } });
  if (!l) throw new ApiError("NOT_FOUND");
  const r = await prisma.listing.update({
    where: { id },
    data: b.takedown ? { status: "WITHDRAWN", takedownReason: b.reason ?? "Moderación" } : { status: "ACTIVE", takedownReason: null },
  });
  await audit(u.id, b.takedown ? "listing.takedown" : "listing.restore", l.titleEs, b);
  return ok({ id: r.id, status: r.status });
});
