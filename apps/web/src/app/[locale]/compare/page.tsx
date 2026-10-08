import type { Locale } from "@/types/domain";
import { PublicPage } from "@/components/layout/PublicPage";
import { CompareView } from "@/components/compare/CompareView";
import { listingsByIds } from "@/server/listings";
import { pageMeta } from "@/lib/seo";
import { tx } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return pageMeta(locale, tx(locale, "Comparar casas", "Compare homes"), "/compare", { index: false });
}

/** ?ids=a,b,c → at most 3 well-formed ids (anything else is ignored). */
function parseIds(raw: string | string[] | undefined): string[] | null {
  const v = Array.isArray(raw) ? raw.join(",") : raw;
  if (!v) return null;
  return [...new Set(v.split(",").map((s) => s.trim()).filter((s) => /^[\w-]{1,64}$/.test(s)))].slice(0, 3);
}

/** Public comparator: no account needed. Without ?ids= it shows the visitor's own selection (kept on the device). */
export default async function ComparePage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  const ids = parseIds((await searchParams).ids);
  return (
    <PublicPage locale={locale} tabbar>
      <CompareView locale={locale} urlIds={ids} initial={ids?.length ? await listingsByIds(ids) : []} />
    </PublicPage>
  );
}
