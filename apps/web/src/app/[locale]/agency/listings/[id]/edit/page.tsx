import { notFound } from "next/navigation";
import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { ListingEditor } from "@/components/agency/ListingEditor";
import { listingById } from "@/server/listings";
import { getAppUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, id } = await params;
  const user = (await getAppUser())!;
  const l = await listingById(id);
  if (!l) notFound();
  const sameAgency = !!l.agencyId && l.agencyId === user.agencyId;
  const manager = user.role === "AGENCY_OWNER" || user.role === "BACKOFFICE";
  const canView = user.role === "SUPERADMIN" || sameAgency;
  if (!canView) notFound();
  const canEdit = user.role === "SUPERADMIN" || (sameAgency && (manager || (user.role === "AGENT" && l.agentId === user.id)));
  const [photos, rule] = await Promise.all([
    prisma.listingPhoto.findMany({ where: { listingId: id }, orderBy: [{ isCover: "desc" }, { order: "asc" }] }),
    l.agencyId ? prisma.commissionRule.findUnique({ where: { agencyId: l.agencyId } }) : null,
  ]);
  return <ListingEditor l={l} locale={locale} photos={photos.map((p) => ({ id: p.id, url: p.url, isCover: p.isCover }))} commission={{ pct: rule?.salePct ?? 5, split: rule?.agentSplitPct ?? 50, rentMonths: rule?.rentMonths ?? 1 }} canEdit={canEdit} />;
}
