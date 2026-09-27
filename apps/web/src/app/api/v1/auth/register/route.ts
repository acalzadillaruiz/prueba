import type { NextRequest } from "next/server";
import { registerSchema } from "@newplace/config";
import bcrypt from "bcryptjs";
import { prisma } from "@newplace/db";
import { ApiError, body, handler, ok } from "@/server/api";
import { audit, queueEmail } from "@/server/data";
import { limit } from "@/server/rate-limit";

const Reg = registerSchema;

/** Email + password sign-up. "¿Eres agencia?" creates the Agency (TRIAL, FREE) with the user as AGENCY_OWNER. */
export const POST = handler(async (req: NextRequest) => {
  await limit(req, "register", 5, 60 * 60);
  const b = await body(req, Reg);
  const email = b.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) throw new ApiError("CONFLICT", { email: "exists" });
  // Team invitation: must be pending and addressed to this email; it replaces the "¿Eres agencia?" flow.
  const inv = b.invite ? await prisma.invitation.findUnique({ where: { token: b.invite }, include: { agency: { select: { status: true } } } }) : null;
  if (b.invite && (!inv || inv.acceptedAt || inv.email !== email || inv.agency.status === "SUSPENDED" || Date.now() - inv.createdAt.getTime() > 14 * 864e5)) throw new ApiError("VALIDATION", { invite: "invalid or for another email" });
  const role = inv ? inv.role : b.agencyName ? "AGENCY_OWNER" : "SEEKER";
  const user = await prisma.user.create({ data: { name: b.name, email, passwordHash: await bcrypt.hash(b.password, 10), role, hue: Math.floor(Math.random() * 360) } });
  if (inv) {
    await prisma.agencyMember.create({ data: { userId: user.id, agencyId: inv.agencyId, role: inv.role } });
    await prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
    await audit(user.id, "team.invite.accept", email, { agencyId: inv.agencyId, role: inv.role });
  }
  if (b.agencyName && !inv) {
    const base = b.agencyName.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const slug = (await prisma.agency.findUnique({ where: { slug: base } })) ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;
    const initials = b.agencyName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    await prisma.agency.create({ data: { name: b.agencyName, slug, city: b.agencyCity ?? "Caracas", initials, members: { create: { userId: user.id, role: "AGENCY_OWNER", verified: false } }, commission: { create: {} } } });
    await audit(user.id, "agency.create", b.agencyName);
  }
  await queueEmail(email, "Verifica tu correo en New Place", "VERIFY");
  return ok({ id: user.id, email }, 201);
});
