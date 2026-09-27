import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { listingForUser } from "@/server/access";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const o = await prisma.offer.findUnique({ where: { id } });
  if (!o) throw new ApiError("NOT_FOUND");
  await listingForUser(o.listingId, u, "edit");
  const b = await body(req, z.object({ status: z.enum(["COUNTERED", "ACCEPTED", "REJECTED"]), note: z.string().max(500).optional() }));
  if (b.status === "ACCEPTED") {
    const other = await prisma.offer.findFirst({ where: { listingId: o.listingId, status: "ACCEPTED", id: { not: id } } });
    if (other) throw new ApiError("CONFLICT", { offer: "another offer is already accepted" });
  }
  const r = await prisma.offer.update({ where: { id }, data: b });
  if (b.status === "ACCEPTED") await prisma.listing.update({ where: { id: o.listingId }, data: { status: "UNDER_OFFER" } });
  return ok(r);
});
