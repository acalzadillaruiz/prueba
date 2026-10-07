import type { NextRequest } from "next/server";
import { z } from "zod";
import { body, currentUser, handler, ok, requireUser } from "@/server/api";
import { getThreadsFor } from "@/server/data";
import { limit } from "@/server/rate-limit";
import { unreadByThread } from "@/server/thread-unread";
import { findOrCreateListingThread } from "@/server/threads";

/** Internal inbox (polled every 15 s). `unread` = messages from others since this user last opened the thread. */
export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  const threads = await getThreadsFor(u.id);
  const unread = await unreadByThread(u.id, threads.map((t) => t.id));
  return ok({ threads: threads.map((t) => ({ ...t, unread: unread[t.id] ?? 0 })), at: new Date().toISOString() });
});

/**
 * "Contactar" on a listing: find-or-create the signed-in user's thread with the listing's assigned advisor.
 * Only `listingId` is accepted; participants are never chosen by the client. 201 when created, 200 when reused.
 */
export const POST = handler(async (req: NextRequest) => {
  const u = requireUser(await currentUser());
  await limit(req, "thread", 20, 10 * 60);
  const { listingId } = await body(req, z.object({ listingId: z.string().trim().min(1).max(64) }).strict());
  const t = await findOrCreateListingThread(u, listingId);
  return ok(t, t.created ? 201 : 200);
});
