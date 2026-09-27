import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit } from "@/server/data";
import { revalidateAllListings } from "@/server/revalidate";

type Ctx = { params: Promise<{ id: string }> };

const Patch = z.object({
    plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).optional(),
    verified: z.boolean().optional(),
    status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL"]).optional(),
    // Same bounds as sign-up ("¿Eres agencia?"). The slug is the agency's stable URL key and never changes.
    name: z.string().trim().min(2).max(80).optional(),
    city: z.string().trim().min(2).max(60).optional(),
  });

/** Plan flags (no billing), verification, status, and name/city edits. Superadmin only. */
export const PATCH = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const user = requireUser(await currentUser());
  if (user.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const b = await body(req, Patch);
  const before = await prisma.agency.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!before) throw new ApiError("NOT_FOUND");
  const a = await prisma.agency.update({ where: { id }, data: b });
  // Name / verification / status show on every public listing card and page of the agency.
  if (b.status || b.verified !== undefined || (b.name && b.name !== before.name)) revalidateAllListings();
  const edited = b.name !== undefined || b.city !== undefined;
  await audit(user.id, edited ? "agency.update" : "agency.flags", a.name, edited && b.name && b.name !== before.name ? { ...b, from: before.name } : b);
  return ok(a);
});
