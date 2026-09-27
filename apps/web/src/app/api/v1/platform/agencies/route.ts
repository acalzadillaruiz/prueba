import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit } from "@/server/data";

export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const b = await body(req, z.object({ name: z.string().min(2), city: z.string().min(2), plan: z.enum(["FREE", "PRO", "ENTERPRISE"]).default("FREE") }));
  const slug = b.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  // Same name twice (same slug) → 409 with a clear reason instead of a unique-constraint 500.
  if (!slug) throw new ApiError("VALIDATION", { name: "invalid name" });
  if ((await prisma.agency.findUnique({ where: { slug }, select: { id: true } }))) throw new ApiError("CONFLICT", { name: "agency already exists" });
  const a = await prisma.agency.create({ data: { name: b.name, slug, city: b.city, plan: b.plan, initials: b.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase(), commission: { create: {} } } });
  await audit(u.id, "agency.create", a.name);
  return ok(a, 201);
});
