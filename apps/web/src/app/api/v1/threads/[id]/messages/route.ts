import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const member = await prisma.threadParticipant.findUnique({ where: { threadId_userId: { threadId: id, userId: u.id } } });
  if (!member && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const { body: text } = await body(req, z.object({ body: z.string().min(1).max(2000) }));
  const m = await prisma.message.create({ data: { threadId: id, senderId: u.id, body: text } });
  await prisma.messageThread.update({ where: { id }, data: { updatedAt: new Date() } });
  return ok({ id: m.id, from: u.name ?? "", body: m.body, at: m.createdAt.toISOString(), mine: true }, 201);
});
