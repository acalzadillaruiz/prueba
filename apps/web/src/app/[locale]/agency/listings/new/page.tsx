import type { Locale } from "@/types/domain";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { OwnerWizard } from "@/components/owner/OwnerWizard";
import { redirect } from "next/navigation";
import { getAgencies, getFx, getZones } from "@/server/data";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** Agency staff create listings with the same 6-step wizard (mode AGENCY). */
export default async function NewAgencyListing({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  // Captors and photographers don't create listings (captures are converted by managers).
  const user = await getAppUser();
  if (!user || !["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"].includes(user.role)) redirect(`/${locale}/agency/listings`);
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
