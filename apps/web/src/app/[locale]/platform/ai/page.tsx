import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { PlatformAI } from "@/components/agency/Platform";
import { aiKeyConfigured } from "@/server/ai";
import { getFx, getSetting } from "@/server/data";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const [provider, fx, listings, agencies, leads, users] = await Promise.all([getSetting("aiProvider", "heuristic"), getFx(), prisma.listing.count(), prisma.agency.count(), prisma.lead.count(), prisma.user.count()]);
  return (
    <PlatformAI
      locale={locale}
      settings={{ aiProvider: provider, aiKeyConfigured: aiKeyConfigured(), aiModel: process.env.AI_MODEL ?? null, aiBaseUrl: process.env.AI_BASE_URL ?? null }}
      fx={fx}
      counts={{ listings, agencies, leads, users }}
    />
  );
}
