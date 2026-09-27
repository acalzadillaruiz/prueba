import type { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import { ApiError, currentUser, handler, ok, requireUser } from "@/server/api";
import { audit } from "@/server/data";
import { limit } from "@/server/rate-limit";
import { unstable_update } from "@/auth";

type Ctx = { params: Promise<{ token: string }> };

async function pending(token: string) {
  const inv = await prisma.invitation.findUnique({ where: { token }, include: { agency: { select: { name: true, status: true } } } });
  if (!inv || inv.acceptedAt || inv.agency.status === "SUSPENDED" || Date.now() - inv.createdAt.getTime() > 14 * 864e5) throw new ApiError("NOT_FOUND");
  return inv;
}

/** Invite details for the sign-up screen ("Andes Prime te invita como AGENT"). The token itself is the secret. */
export const GET = handler(async (req: NextRequest, { params }: Ctx) => {
  await limit(req, "invite-lookup", 30, 60);
  const inv = await pending((await params).token);
  return ok({ agencyName: inv.agency.name, role: inv.role, email: inv.email });
});

/** An existing account accepts the invite (its email must match the invited address). */
export const POST = handler(async (_req: NextRequest, { params }: Ctx) => {
  const u = requireUser(await currentUser());
  const inv = await pending((await params).token);
  if ((u.email ?? "").toLowerCase() !== inv.email) throw new ApiError("FORBIDDEN", { email: "invite is for another address" });
  if (await prisma.agencyMember.findFirst({ where: { userId: u.id } })) throw new ApiError("CONFLICT", { agency: "already in an agency" });
  await prisma.$transaction([
    prisma.agencyMember.create({ data: { userId: u.id, agencyId: inv.agencyId, role: inv.role } }),
    prisma.user.update({ where: { id: u.id }, data: { role: inv.role } }),
    prisma.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
  ]);
  await audit(u.id, "team.invite.accept", inv.email, { agencyId: inv.agencyId, role: inv.role });
  // Refresh the session cookie so the new role applies now (middleware reads it from the JWT).
  await unstable_update({}).catch(() => {});
  return ok({ agencyId: inv.agencyId, role: inv.role });
});
