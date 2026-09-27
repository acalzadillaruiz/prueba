import { currentUser, handler, ok, requireUser } from "@/server/api";
import { getThreadsFor } from "@/server/data";
import { unreadByThread } from "@/server/thread-unread";

/** Internal inbox (polled every 15 s). `unread` = messages from others since this user last opened the thread. */
export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  const threads = await getThreadsFor(u.id);
  const unread = await unreadByThread(u.id, threads.map((t) => t.id));
  return ok({ threads: threads.map((t) => ({ ...t, unread: unread[t.id] ?? 0 })), at: new Date().toISOString() });
});
