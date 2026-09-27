import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Locale } from "@/types/domain";
import { listingBySlug } from "@/server/listings";
import { getAppUser } from "@/server/session";
import { tx } from "@/lib/i18n";
import { ListingView } from "../../listing/[slug]/ListingView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Authenticated preview of any listing the user may see (drafts, under review, taken down, private). */
export default async function PreviewPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const user = await getAppUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/preview/${slug}`);
  const l = await listingBySlug(slug);
  if (!l) notFound();
  const allowed = user.role === "SUPERADMIN" || user.id === l.ownerUserId || (!!l.agencyId && user.agencyId === l.agencyId);
  if (!allowed) notFound();
  return (
    <>
      <div className="sticky top-0 z-50 bg-navy px-4 py-2 text-center text-sm font-semibold text-ivory" role="status">
        {tx(locale, "Vista previa privada · así se verá la ficha", "Private preview · this is how the listing will look")}
      </div>
      <ListingView locale={locale} l={l} />
    </>
  );
}
