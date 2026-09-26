import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isStaff, requireAgency } from "@/server/access";
import { ApiError } from "@/server/api";
import { getCaptures } from "@/server/data";
import { findDuplicate, fingerprintOf } from "@/server/listing-service";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  if (!isStaff(u) && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  return ok({ items: await getCaptures(requireAgency(u)) });
});

const Create = z.object({
  address: z.string().min(5),
  zone: z.string().min(2),
  ownerName: z.string().min(2),
  phone: z.string().min(6),
  kind: z.string().default("apartment"),
  areaM2: z.number().int().positive(),
  askingPrice: z.number().int().positive(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (!["CAPTOR", "AGENCY_OWNER", "BACKOFFICE", "AGENT", "SUPERADMIN"].includes(u.role)) throw new ApiError("FORBIDDEN");
  const agencyId = requireAgency(u);
  const b = await body(req, Create);
  const dup = await findDuplicate(b.lat ?? 0, b.lng ?? 0, b.areaM2, b.address);
  const c = await prisma.captureLead.create({
    data: { ...b, agencyId, captorId: u.id, fingerprint: fingerprintOf(b.lat ?? 0, b.lng ?? 0, b.areaM2, b.address), result: dup ? "DUPLICATE" : "PENDING", duplicateOfId: dup?.id },
  });
  return ok(c, 201);
});
