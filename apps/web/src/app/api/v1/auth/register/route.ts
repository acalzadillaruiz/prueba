import type { NextRequest } from "next/server";
import { registerSchema } from "@newplace/config";
import bcrypt from "bcryptjs";
import { prisma } from "@newplace/db";
import { ApiError, body, handler, ok } from "@/server/api";
import { audit, queueEmail } from "@/server/data";

const Reg = registerSchema;

/** Email + password sign-up. "¿Eres agencia?" creates the Agency (TRIAL, FREE) with the user as AGENCY_OWNER. */
export const POST = handler(async (req: NextRequest) => {
  const b = await body(req, Reg);
  const email = b.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new ApiError("CONFLICT", { email: "exists" });
  const user = await prisma.user.create({ data: { name: b.name, email, passwordHash: await bcrypt.hash(b.password, 10), role: b.agencyName ? "AGENCY_OWNER" : "SEEKER", hue: Math.floor(Math.random() * 360) } });
  if (b.agencyName) {
    const base = b.agencyName.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = (await prisma.agency.findUnique({ where: { slug: base } })) ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;
    const initials = b.agencyName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    await prisma.agency.create({ data: { name: b.agencyName, slug, city: b.agencyCity ?? "Caracas", initials, members: { create: { userId: user.id, role: "AGENCY_OWNER", verified: false } }, commission: { create: {} } } });
    await audit(user.id, "agency.create", b.agencyName);
  }
  await queueEmail(email, "Verifica tu correo en New Place", "VERIFY");
  return ok({ id: user.id, email }, 201);
});
