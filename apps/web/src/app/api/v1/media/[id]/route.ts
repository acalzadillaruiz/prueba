import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager } from "@/server/access";
import { assertMediaDate, assertPhotographer } from "@/server/media";
import { audit } from "@/server/data";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({
  // Any status, forwards or backwards (a delivery can be reopened, a shoot rescheduled).
  status: z.enum(["SCHEDULED", "SHOOTING", "UPLOADING", "DELIVERED"]).optional(),
  floorplan: z.boolean().optional(),
  video: z.boolean().optional(),
  // Managers only: reassign / reschedule.
  photographerId: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
});

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const j = await prisma.mediaJob.findUnique({ where: { id }, include: { listing: { select: { agencyId: true, titleEs: true } } } });
  if (!j) throw new ApiError("NOT_FOUND");
  const manager = u.role === "SUPERADMIN" || (isManager(u) && !!j.listing.agencyId && j.listing.agencyId === u.agencyId);
  const photographer = u.role === "PHOTOGRAPHER" && j.photographerId === u.id;
  if (!manager && !photographer) throw new ApiError("FORBIDDEN");
  const b = await body(req, Patch);
  if ((b.photographerId !== undefined || b.date !== undefined) && !manager) throw new ApiError("FORBIDDEN");
  let newPhotographer: { id: string; name: string } | null = null;
  if (b.photographerId && b.photographerId !== j.photographerId) {
    if (!j.listing.agencyId) throw new ApiError("VALIDATION", { photographerId: "listing has no agency" });
    newPhotographer = await assertPhotographer(j.listing.agencyId, b.photographerId);
  }
  const date = b.date ? assertMediaDate(b.date) : undefined;
  const photos = await prisma.listingPhoto.count({ where: { listingId: j.listingId } });
  const cover = (await prisma.listingPhoto.count({ where: { listingId: j.listingId, isCover: true } })) > 0;
  const r = await prisma.mediaJob.update({
    where: { id },
    data: { status: b.status, floorplan: b.floorplan, video: b.video, photographerId: newPhotographer?.id, date, photos, cover },
  });
  if (b.floorplan !== undefined) await prisma.listing.update({ where: { id: j.listingId }, data: { hasFloorplan: b.floorplan } });
  if (b.video !== undefined) await prisma.listing.update({ where: { id: j.listingId }, data: { hasVideo: b.video } });
  if (b.status && b.status !== j.status) await audit(u.id, "media.status", j.listing.titleEs, { jobId: id, from: j.status, to: b.status });
  if (newPhotographer || date) await audit(u.id, "media.assign", j.listing.titleEs, { jobId: id, ...(newPhotographer ? { photographer: newPhotographer.name } : {}), ...(b.date ? { date: b.date } : {}) });
  if (b.floorplan !== undefined || b.video !== undefined) await audit(u.id, "media.checklist", j.listing.titleEs, { jobId: id, floorplan: b.floorplan, video: b.video });
  return ok(r);
});
