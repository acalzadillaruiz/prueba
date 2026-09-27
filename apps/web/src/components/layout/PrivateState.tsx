import { prisma } from "@newplace/db";
import { AppStateProvider } from "@/lib/store";
import { getAppAgency, getAppUser } from "@/server/session";

/**
 * Private areas (agency, platform, owner, hub, account, saved, alerts) render with the session read on the
 * server, so the header and role-based UI are correct on first paint. These pages are never cached.
 */
export async function PrivateState({ children }: { children: React.ReactNode }) {
  const user = await getAppUser();
  const [agency, saved] = await Promise.all([
    getAppAgency(user?.agencyId ?? null),
    user ? prisma.savedListing.findMany({ where: { userId: user.id }, select: { listingId: true }, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
  ]);
  return (
    <AppStateProvider user={user} agency={agency} savedIds={saved.map((s) => s.listingId)}>
      {children}
    </AppStateProvider>
  );
}
