import type { Locale } from "@/types/domain";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { OwnerWizard } from "@/components/owner/OwnerWizard";
import { NoAgency } from "@/components/agency/NoAgency";
import { redirect } from "next/navigation";
import { getAgencies, getFx, getZones } from "@/server/data";
import { requireAgencyPage } from "@/server/session";

export const dynamic = "force-dynamic";

/** Agency staff create listings with the same 6-step wizard (mode AGENCY). */
export default async function NewAgencyListing({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  // Signed in, member of an operating agency (a superadmin must impersonate one first: the listing belongs to it).
  const g = await requireAgencyPage(locale, "listings");
  if (!g) return <NoAgency locale={locale} />;
  // Captors and photographers don't create listings (captures are converted by managers).
  if (!["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"].includes(g.user.role)) redirect(`/${locale}/agency/listings`);
  const [zones, agencies, fx] = await Promise.all([getZones(), getAgencies(), getFx()]);
  return (
    <div className="np-public min-h-screen">
      <PublicHeader locale={locale} />
      <main id="main">
        <OwnerWizard locale={locale} zones={zones} agencies={agencies} fxVes={fx.find((f) => f.code === "VES")?.perUsd ?? 0} staff />
      </main>
    </div>
  );
}
