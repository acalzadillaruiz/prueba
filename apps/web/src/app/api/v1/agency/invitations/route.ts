import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager, requireAgency } from "@/server/access";
import { audit, queueEmail } from "@/server/data";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  if (!isManager(u) && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const items = await prisma.invitation.findMany({ where: { agencyId: requireAgency(u), acceptedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, email: true, role: true, createdAt: true } });
  return ok({ items });
});

export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (!isManager(u) && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const agencyId = requireAgency(u);
  const b = await body(req, z.object({ email: z.string().email(), role: z.enum(["AGENT", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE"]) }));
  const email = b.email.toLowerCase();
  const member = await prisma.agencyMember.findFirst({ where: { agencyId, user: { email } } });
  if (member) throw new ApiError("CONFLICT", { email: "already a member" });
  // Re-inviting the same person replaces the pending invite (new token, new role) instead of piling up rows.
  await prisma.invitation.deleteMany({ where: { agencyId, email, acceptedAt: null } });
  const token = crypto.randomUUID();
  const inv = await prisma.invitation.create({ data: { agencyId, email, role: b.role, token } });
  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });
  await queueEmail(email, `${agency.name} te invita a su equipo en New Place (${b.role})`, "INVITE", `/es/register?invite=${token}`);
  await audit(u.id, "team.invite", b.email, { role: b.role });
  return ok({ id: inv.id, email: inv.email, role: inv.role, createdAt: inv.createdAt }, 201);
});

/** Revoke a pending invite (?id=). */
export const DELETE = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (!isManager(u) && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const inv = await prisma.invitation.findFirst({ where: { id, agencyId: requireAgency(u), acceptedAt: null }, select: { email: true } });
  const r = await prisma.invitation.deleteMany({ where: { id, agencyId: requireAgency(u), acceptedAt: null } });
  if (!inv || !r.count) throw new ApiError("NOT_FOUND");
  await audit(u.id, "team.invite.revoke", inv.email);
  return ok({ ok: true });
});
