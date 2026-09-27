import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@newplace/db";
import { ApiError, body, currentUser, handler, ok, requireUser } from "@/server/api";
import { limit } from "@/server/rate-limit";
import { participantOf } from "@/server/thread-unread";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  const member = await participantOf(id, u.id);
  if (!member && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  if (!member && !(await prisma.messageThread.findUnique({ where: { id }, select: { id: true } }))) throw new ApiError("NOT_FOUND");
  await limit(req, "message", 60, 10 * 60);
  const { body: text } = await body(req, z.object({ body: z.string().trim().min(1).max(2000) }));
  const m = await prisma.message.create({ data: { threadId: id, senderId: u.id, body: text } });
  await prisma.messageThread.update({ where: { id }, data: { updatedAt: new Date() } });
  // Writing in a thread means you have read it.
  if (member) await prisma.threadParticipant.update({ where: { threadId_userId: { threadId: id, userId: u.id } }, data: { lastRead: m.createdAt } });
  return ok({ id: m.id, from: u.name ?? "", body: m.body, at: m.createdAt.toISOString(), mine: true }, 201);
});
