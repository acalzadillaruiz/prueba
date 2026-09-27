import type { NextRequest } from "next/server";
import { captureSchema } from "@newplace/config";
import { prisma } from "@newplace/db";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { requireAgency } from "@/server/access";
import { ApiError } from "@/server/api";
import { getCaptures } from "@/server/data";
import { findDuplicate, fingerprintOf } from "@/server/listing-service";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  // Capture leads contain property owners' phone numbers: captors and managers only.
  if (!["CAPTOR", "AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"].includes(u.role)) throw new ApiError("FORBIDDEN");
  return ok({ items: await getCaptures(requireAgency(u)) });
});

const Create = captureSchema;

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
