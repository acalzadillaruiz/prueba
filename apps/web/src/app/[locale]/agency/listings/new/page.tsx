import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { OwnerWizard } from "@/components/owner/OwnerWizard";
import { NoAgency } from "@/components/agency/NoAgency";
import { redirect } from "next/navigation";
import { getAgencies, getFx, getZones } from "@/server/data";
import { tx } from "@/lib/i18n";
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
  // Inside the agency cockpit (sidebar / section bar, no public nav or CTAs). The wizard draws one <h1> per step, so the
  // shell header only carries the way back. Beside the sidebar the wizard's preview column only fits from xl, and the
  // shell already pads the content: the wizard's own outer padding is dropped. np-public keeps its dark-theme tokens.
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Nuevo inmueble", "New listing")} headless back={{ href: `/${locale}/agency/listings`, label: tx(locale, "Volver a Inmuebles", "Back to Listings") }}>
      <div className="np-public -mt-2 bg-transparent [&>div]:px-0 [&>div]:pb-0 [&>div]:pt-2 max-xl:[&>div>aside]:hidden max-xl:[&>div]:grid-cols-1">
        <OwnerWizard locale={locale} zones={zones} agencies={agencies} fxVes={fx.find((f) => f.code === "VES")?.perUsd ?? 0} staff />
      </div>
    </AdminShell>
  );
}
