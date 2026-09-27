import "server-only";
import { prisma } from "@newplace/db";

/** Unread count per thread: messages from other people newer than this user's `lastRead`. */
export async function unreadByThread(userId: string, threadIds: string[]): Promise<Record<string, number>> {
  if (!threadIds.length) return {};
  const parts = await prisma.threadParticipant.findMany({ where: { userId, threadId: { in: threadIds } }, select: { threadId: true, lastRead: true } });
  const counts = await Promise.all(
    parts.map(async (p) => [p.threadId, await prisma.message.count({ where: { threadId: p.threadId, senderId: { not: userId }, createdAt: { gt: p.lastRead } } })] as const),
  );
  return Object.fromEntries(counts);
}

/** The participant row, or null when the user is not part of the thread. */
export async function participantOf(threadId: string, userId: string) {
  return prisma.threadParticipant.findUnique({ where: { threadId_userId: { threadId, userId } } });
}
