import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager, requireAgency } from "@/server/access";
import { assertMediaDate, assertPhotographer } from "@/server/media";
import { audit } from "@/server/data";

const Create = z.object({ listingId: z.string().min(1), photographerId: z.string().min(1), date: z.string().datetime() });

/** Managers create/assign a photo shoot: listing and photographer must both belong to their agency. */
export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (!isManager(u) && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const agencyId = requireAgency(u);
  const b = await body(req, Create);
  const date = assertMediaDate(b.date);
  const listing = await prisma.listing.findUnique({ where: { id: b.listingId }, select: { id: true, agencyId: true, titleEs: true } });
  if (!listing) throw new ApiError("NOT_FOUND");
  if (listing.agencyId !== agencyId) throw new ApiError("FORBIDDEN", { listingId: "other agency" });
  const photographer = await assertPhotographer(agencyId, b.photographerId);
  const photos = await prisma.listingPhoto.count({ where: { listingId: listing.id } });
  const cover = (await prisma.listingPhoto.count({ where: { listingId: listing.id, isCover: true } })) > 0;
  const job = await prisma.mediaJob.create({ data: { listingId: listing.id, photographerId: photographer.id, date, photos, cover } });
  await audit(u.id, "media.create", listing.titleEs, { jobId: job.id, photographer: photographer.name, date: b.date });
  return ok(job, 201);
});
