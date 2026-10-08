import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { PublicPage } from "@/components/layout/PublicPage";
import { SavedView } from "@/components/seeker/SavedView";
import { listingsByIds } from "@/server/listings";
import { getAppUser } from "@/server/session";
import { pageMeta } from "@/lib/seo";
import { tx } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Guardados", "Saved homes"), "/saved", { index: false });
}

export default async function SavedPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const user = await getAppUser();
  const ids = user ? (await prisma.savedListing.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { listingId: true } })).map((s) => s.listingId) : [];
  return (
    <PublicPage locale={locale} tabbar>
      <SavedView locale={locale} all={await listingsByIds(ids)} />
    </PublicPage>
  );
}
