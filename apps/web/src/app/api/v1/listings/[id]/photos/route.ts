import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { listingForUser } from "@/server/access";
import { storage } from "@/server/storage";
import { qualityOf } from "@/server/listing-service";

type Ctx = { params: Promise<{ id: string }> };
const MAX = 12 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Real type from the file's first bytes (the browser-sent MIME is not trusted). */
function sniff(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.toString("ascii", 4, 8) === "ftyp" && /^avi[fs]$/.test(b.toString("ascii", 8, 12))) return "image/avif";
  return null;
}

async function refreshQuality(id: string) {
  const l = await prisma.listing.findUniqueOrThrow({ where: { id }, include: { _count: { select: { photos: true } } } });
  await prisma.listing.update({ where: { id }, data: { quality: qualityOf({ photos: l._count.photos, titleEn: l.titleEn, bodyEn: l.bodyEn, lat: l.lat, hasFloorplan: l.hasFloorplan, hasVirtualTour: l.hasVirtualTour }) } });
}

/** Bulk upload (multipart field "files"). Order follows upload order; first photo becomes cover if none. */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  await listingForUser(id, u, "photos");
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) throw new ApiError("VALIDATION", { files: "required" });
  let order = await prisma.listingPhoto.count({ where: { listingId: id } });
  const hasCover = (await prisma.listingPhoto.count({ where: { listingId: id, isCover: true } })) > 0;
  const created = [];
  for (const [i, f] of files.entries()) {
    const bad = () => new ApiError("VALIDATION", { files: `${f.name}: JPG/PNG/WebP ≤ 12 MB` });
    if (f.size > MAX) throw bad();
    const buf = Buffer.from(await f.arrayBuffer());
    const type = sniff(buf);
    if (!type || !TYPES.includes(type)) throw bad();
    const ext = type.split("/")[1].replace("jpeg", "jpg");
    const key = `listings/${id}/${Date.now().toString(36)}-${i}.${ext}`;
    const url = await storage.put(key, buf, type);
    created.push(await prisma.listingPhoto.create({ data: { listingId: id, url, order: order++, isCover: !hasCover && i === 0 } }));
  }
  await refreshQuality(id);
  return ok({ photos: created }, 201);
});

const Reorder = z.object({ order: z.array(z.string()).optional(), cover: z.string().optional(), remove: z.string().optional() });

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  await listingForUser(id, u, "photos");
  const b = await body(req, Reorder);
  if (b.remove) await prisma.listingPhoto.deleteMany({ where: { id: b.remove, listingId: id } });
  if (b.order) await prisma.$transaction(b.order.map((pid, i) => prisma.listingPhoto.updateMany({ where: { id: pid, listingId: id }, data: { order: i } })));
  if (b.cover) await prisma.$transaction([prisma.listingPhoto.updateMany({ where: { listingId: id }, data: { isCover: false } }), prisma.listingPhoto.updateMany({ where: { id: b.cover, listingId: id }, data: { isCover: true } })]);
  await refreshQuality(id);
  return ok({ photos: await prisma.listingPhoto.findMany({ where: { listingId: id }, orderBy: [{ isCover: "desc" }, { order: "asc" }] }) });
});

export const GET = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  return ok({ photos: await prisma.listingPhoto.findMany({ where: { listingId: id }, orderBy: [{ isCover: "desc" }, { order: "asc" }] }) });
});
