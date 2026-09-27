import type { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import { ApiError, currentUser, handler, ok, requireUser } from "@/server/api";
import { participantOf } from "@/server/thread-unread";

type Ctx = { params: Promise<{ id: string }> };

/** Marks the thread as read for the current participant. */
export const POST = handler(async (_req: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const u = requireUser(await currentUser());
  if (!(await participantOf(id, u.id))) throw new ApiError("FORBIDDEN");
  await prisma.threadParticipant.update({ where: { threadId_userId: { threadId: id, userId: u.id } }, data: { lastRead: new Date() } });
  return ok({ ok: true });
});
