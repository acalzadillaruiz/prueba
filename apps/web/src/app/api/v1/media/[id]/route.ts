import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager } from "@/server/access";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const j = await prisma.mediaJob.findUnique({ where: { id }, include: { listing: { select: { agencyId: true } } } });
  if (!j) throw new ApiError("NOT_FOUND");
  if (!(u.role === "SUPERADMIN" || j.photographerId === u.id || (isManager(u) && j.listing.agencyId === u.agencyId))) throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ status: z.enum(["SCHEDULED", "SHOOTING", "UPLOADING", "DELIVERED"]).optional(), floorplan: z.boolean().optional(), video: z.boolean().optional() }));
  const photos = await prisma.listingPhoto.count({ where: { listingId: j.listingId } });
  const cover = (await prisma.listingPhoto.count({ where: { listingId: j.listingId, isCover: true } })) > 0;
  const r = await prisma.mediaJob.update({ where: { id }, data: { ...b, photos, cover } });
  if (b.floorplan !== undefined) await prisma.listing.update({ where: { id: j.listingId }, data: { hasFloorplan: b.floorplan } });
  if (b.video !== undefined) await prisma.listing.update({ where: { id: j.listingId }, data: { hasVideo: b.video } });
  return ok(r);
});
