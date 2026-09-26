import { currentUser, handler, ok, requireUser } from "@/server/api";
import { getThreadsFor } from "@/server/data";

/** Internal inbox (polled every 15 s). */
export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  return ok({ threads: await getThreadsFor(u.id), at: new Date().toISOString() });
});
