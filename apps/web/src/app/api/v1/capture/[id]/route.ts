import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit } from "@/server/data";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  // Same roles that can open the capture queue.
  if (!["CAPTOR", "AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"].includes(u.role)) throw new ApiError("FORBIDDEN");
  const c = await prisma.captureLead.findUnique({ where: { id }, select: { agencyId: true, address: true, result: true, listingId: true } });
  if (!c) throw new ApiError("NOT_FOUND");
  if (u.role !== "SUPERADMIN" && (!u.agencyId || c.agencyId !== u.agencyId)) throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ result: z.enum(["PENDING", "CAPTURED", "REJECTED", "DUPLICATE"]) }));
  // A capture already turned into a listing keeps its CAPTURED result.
  if (c.listingId && b.result !== "CAPTURED") throw new ApiError("CONFLICT", { listingId: c.listingId });
  // Minimal DTO: the client already holds the row; never echo the owner's name/phone back.
  const r = await prisma.captureLead.update({ where: { id }, data: { result: b.result }, select: { id: true, result: true, listingId: true, duplicateOfId: true } });
  if (b.result !== c.result) await audit(u.id, "capture.result", c.address, { from: c.result, to: b.result });
  return ok(r);
});
