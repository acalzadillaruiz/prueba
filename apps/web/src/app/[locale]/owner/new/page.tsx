import { Suspense } from "react";
import type { Locale } from "@/types/domain";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { OwnerWizard } from "@/components/owner/OwnerWizard";

export default async function OwnerNew({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return (
    <>
      <PublicHeader locale={locale} />
      <Suspense>
        <OwnerWizard locale={locale} />
      </Suspense>
    </>
  );
}
