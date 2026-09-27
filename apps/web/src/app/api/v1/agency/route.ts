import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { requireAgency } from "@/server/access";
import { audit } from "@/server/data";

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
});

/** Agency branding (white-label light). Owner only. */
export const PATCH = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (u.role !== "AGENCY_OWNER" && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const b = await body(req, Patch);
  const a = await prisma.agency.update({ where: { id: requireAgency(u) }, data: b });
  await audit(u.id, "agency.branding", a.name, b);
  return ok(a);
});
