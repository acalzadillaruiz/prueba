import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { listingForUser, visibleListingId } from "@/server/access";
import { storage } from "@/server/storage";
import { refreshQuality } from "@/server/listing-service";
import { revalidateListing } from "@/server/revalidate";

type Ctx = { params: Promise<{ id: string }> };
const MAX = 12 * 1024 * 1024;
/** Per request and per listing caps: one multipart body can't fill the disk or the photos table. */
const MAX_FILES = 20;
const MAX_BODY = MAX_FILES * MAX + 1024 * 1024;
const MAX_PHOTOS = 60;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Real type from the file's first bytes (the browser-sent MIME is not trusted). */
function sniff(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.toString("ascii", 4, 8) === "ftyp" && /^avi[fs]$/.test(b.toString("ascii", 8, 12))) return "image/avif";
  return null;
}

/** Bulk upload (multipart field "files"). Order follows upload order; first photo becomes cover if none. */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  await listingForUser(id, u, "photos");
  // Reject oversized bodies before buffering them (a missing/unparseable length is bounded by the per-file checks).
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) throw new ApiError("VALIDATION", { files: `≤ ${MAX_FILES} × 12 MB` });
  const form = await req.formData().catch(() => {
    throw new ApiError("VALIDATION", { files: "multipart/form-data required" });
  });
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) throw new ApiError("VALIDATION", { files: "required" });
  let order = await prisma.listingPhoto.count({ where: { listingId: id } });
  if (files.length > MAX_FILES || order + files.length > MAX_PHOTOS) throw new ApiError("VALIDATION", { files: `max ${MAX_FILES} per upload, ${MAX_PHOTOS} per listing` });
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
  revalidateListing((await refreshQuality(id))?.slug);
  return ok({ photos: created }, 201);
});

const Reorder = z.object({ order: z.array(z.string().max(64)).max(MAX_PHOTOS).optional(), cover: z.string().max(64).optional(), remove: z.string().max(64).optional() });

/** Storage key of an uploaded photo of this listing (local `/uploads/<key>` or a Blob URL), else null (seed art). */
function uploadedKey(url: string, listingId: string): string | null {
  const path = decodeURIComponent(new URL(url, "http://local").pathname).replace(/^\/(uploads\/)?/, "");
  return path.startsWith(`listings/${listingId}/`) && !path.includes("..") ? path : null;
}

export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  await listingForUser(id, u, "photos");
  const b = await body(req, Reorder);
  if (b.remove) {
    // Delete the file too: a removed photo (a wrong upload, an ID card…) must stop being served at its old URL.
    const gone = await prisma.listingPhoto.findFirst({ where: { id: b.remove, listingId: id } });
    if (gone) {
      await prisma.listingPhoto.delete({ where: { id: gone.id } });
      const key = uploadedKey(gone.url, id);
      if (key) await storage.remove(key);
    }
  }
  if (b.order) await prisma.$transaction(b.order.map((pid, i) => prisma.listingPhoto.updateMany({ where: { id: pid, listingId: id }, data: { order: i } })));
  if (b.cover) await prisma.$transaction([prisma.listingPhoto.updateMany({ where: { listingId: id }, data: { isCover: false } }), prisma.listingPhoto.updateMany({ where: { id: b.cover, listingId: id }, data: { isCover: true } })]);
  // Removing the cover promotes the next photo in order: a listing with photos always has a cover.
  if (!(await prisma.listingPhoto.count({ where: { listingId: id, isCover: true } }))) {
    const next = await prisma.listingPhoto.findFirst({ where: { listingId: id }, orderBy: { order: "asc" } });
    if (next) await prisma.listingPhoto.update({ where: { id: next.id }, data: { isCover: true } });
  }
  revalidateListing((await refreshQuality(id))?.slug);
  return ok({ photos: await prisma.listingPhoto.findMany({ where: { listingId: id }, orderBy: [{ isCover: "desc" }, { order: "asc" }] }) });
});

export const GET = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  await visibleListingId(id, await currentUser());
  return ok({ photos: await prisma.listingPhoto.findMany({ where: { listingId: id }, orderBy: [{ isCover: "desc" }, { order: "asc" }] }) });
});
