import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { OwnerWizard } from "@/components/owner/OwnerWizard";
import { getAgencies, getFx, getZones } from "@/server/data";
import { pageMeta } from "@/lib/seo";
import { tx } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Own title and canonical (the owner layout's "Mis inmuebles" doesn't describe this page). */
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Publicar inmueble", "List a property"), "/owner/new", { index: false });
}

export default async function OwnerNew({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [zones, agencies, fx] = await Promise.all([getZones(), getAgencies(), getFx()]);
  return (
    <PublicPage locale={locale} footer={false} tabbar>
      <OwnerWizard locale={locale} zones={zones} agencies={agencies.filter((a) => a.status !== "SUSPENDED")} fxVes={fx.find((f) => f.code === "VES")?.perUsd ?? 0} />
    </PublicPage>
  );
}
