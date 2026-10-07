import type { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma, prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { requireAgency } from "@/server/access";
import { audit } from "@/server/data";
import { assertOnCallMembers } from "@/server/on-call";
import { onCallSchema } from "@/lib/on-call";

/** Logo: an https URL (no credentials) or a same-origin upload path — never javascript:/data:/http: or `//host`. */
const logoUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => {
    if (v.startsWith("/uploads/")) return !v.includes("..") && !v.includes("\\") && /^\/uploads\/[\w\-./%]+$/.test(v);
    try {
      const url = new URL(v);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "https URL or /uploads/ path");

const Patch = z.object({
  name: z.string().min(2).max(80).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex colour #RRGGBB").optional(),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  logoUrl: logoUrl.nullable().optional(),
  /** Guardia 24/7 weekday rotation; every id must be an advisor (AGENT / AGENCY_OWNER) of this agency. */
  onCall: onCallSchema.nullable().optional(),
});

/** Agency branding (white-label light) and Guardia 24/7 rotation. Owner only. */
export const PATCH = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (u.role !== "AGENCY_OWNER" && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const agencyId = requireAgency(u);
  const { onCall, ...branding } = await body(req, Patch);
  if (onCall) await assertOnCallMembers(agencyId, onCall);
  const before = onCall !== undefined ? await prisma.agency.findUnique({ where: { id: agencyId }, select: { onCall: true } }) : null;
  const a = await prisma.agency.update({
    where: { id: agencyId },
    data: { ...branding, ...(onCall !== undefined ? { onCall: onCall ?? Prisma.DbNull } : {}) },
  });
  if (Object.keys(branding).length) await audit(u.id, "agency.branding", a.name, branding);
  if (onCall !== undefined && JSON.stringify(before?.onCall ?? null) !== JSON.stringify(onCall)) await audit(u.id, "agency.oncall", a.name, { from: before?.onCall ?? null, to: onCall });
  return ok(a);
});
