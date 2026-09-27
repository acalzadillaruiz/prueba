import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { isManager, requireAgency } from "@/server/access";
import { audit, queueEmail } from "@/server/data";

export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  if (!isManager(u)) throw new ApiError("FORBIDDEN");
  const items = await prisma.invitation.findMany({ where: { agencyId: requireAgency(u), acceptedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, email: true, role: true, createdAt: true } });
  return ok({ items });
});

export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  if (!isManager(u)) throw new ApiError("FORBIDDEN");
  const agencyId = requireAgency(u);
  const b = await body(req, z.object({ email: z.string().email(), role: z.enum(["AGENT", "CAPTOR", "PHOTOGRAPHER", "BACKOFFICE"]) }));
  const token = crypto.randomUUID();
  const inv = await prisma.invitation.create({ data: { agencyId, email: b.email.toLowerCase(), role: b.role, token } });
  const agency = await prisma.agency.findUniqueOrThrow({ where: { id: agencyId } });
  await queueEmail(b.email, `${agency.name} te invita a New Place (${b.role})`, "INVITE", `/es/register?invite=${token}`);
  await audit(u.id, "team.invite", b.email, { role: b.role });
  return ok({ id: inv.id, email: inv.email, role: inv.role, createdAt: inv.createdAt }, 201);
});
