import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Avatar, Badge } from "@/components/ui";
import { TYPE_LABEL, lbl, money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { CompareButton, SaveButton, StatusBadge } from "./bits";

/** "5 hab. · 6 baños · 620 m²" (metadata line, ≥ 14 px). */
export function factsLine(l: Pick<Listing, "beds" | "baths" | "areaM2">, locale: Locale) {
  return [
    l.beds > 0 && `${l.beds} ${tx(locale, "hab.", l.beds === 1 ? "bed" : "beds")}`,
    l.baths > 0 && `${l.baths} ${tx(locale, l.baths === 1 ? "baño" : "baños", l.baths === 1 ? "bath" : "baths")}`,
    `${num(l.areaM2, locale)} m²`,
  ].filter(Boolean) as string[];
}

/** Brand badges on the photo: Exclusive (luxury) → status → new → view. Two at most, calm. */
function PhotoBadges({ l, locale }: { l: Listing; locale: Locale }) {
  const fresh = Date.now() - Date.parse(l.publishedAt) < 24 * 3600_000;
  const drop = l.priceHistory?.some((p) => p.kind === "DROP");
  const out: React.ReactNode[] = [];
  if (l.luxury) out.push(<Badge key="x" tone="exclusive">{tx(locale, "Exclusiva New Place", "New Place exclusive")}</Badge>);
  if (l.status !== "ACTIVE") out.push(<StatusBadge key="s" status={l.status} locale={locale} />);
  if (fresh && l.status === "ACTIVE") out.push(<Badge key="n" tone="arena">{tx(locale, "Nuevo", "New")}</Badge>);
  if (drop) out.push(<Badge key="d" tone="arena">{tx(locale, "Bajó de precio", "Price cut")}</Badge>);
  if (l.amenities?.includes("view")) out.push(<Badge key="v" tone="egeo">{tx(locale, "Con vista", "With a view")}</Badge>);
  return <div className="absolute left-3 top-3 flex max-w-[calc(100%-4.5rem)] flex-wrap gap-1.5">{out.slice(0, 2)}</div>;
}

/** Assigned advisor in the card footer: small avatar, name and a verified tick. Quiet by design (muted, one line). */
export function CardAdvisor({ agent, locale }: { agent: NonNullable<Listing["agent"]>; locale: Locale }) {
  const initials = agent.name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  const label = tx(locale, "Asesor/a verificado/a", "Verified advisor");
  return (
    <div className="mt-2.5 flex min-w-0 items-center gap-2 text-sm text-muted" data-testid="card-advisor">
      <span aria-hidden className="contents"><Avatar initials={initials} hue={agent.hue} size={24} /></span>
      <span className="sr-only">{tx(locale, "Asesor/a:", "Advisor:")}</span>
      <span className="truncate">{agent.name}</span>
      {agent.verified && (
        <span className="inline-flex shrink-0 items-center text-ok" title={label}>
          <ShieldCheck size={14} aria-hidden />
          <span className="sr-only">{label}</span>
        </span>
      )}
    </div>
  );
}

export function ListingCard({ l, locale, compact, className, showCompare }: { l: Listing; locale: Locale; compact?: boolean; className?: string; showCompare?: boolean }) {
  return (
    <Link
      href={`/${locale}/listing/${l.slug}`}
      className={cn("group block overflow-hidden rounded-np bg-white shadow-[0_1px_2px_rgba(22,38,56,.05),0_8px_24px_rgba(22,38,56,.06)] transition-shadow duration-np hover:shadow-[0_2px_4px_rgba(22,38,56,.06),0_16px_36px_rgba(22,38,56,.12)]", className)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-arena">
        <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]" label={tx(locale, l.title_es, l.title_en)} />
        <PhotoBadges l={l} locale={locale} />
        <SaveButton id={l.id} locale={locale} className="absolute right-2.5 top-2.5" />
        {/* Honest label for illustration-only listings (never a fake "1/8" photo counter). */}
        {l.photos?.length ? (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-navy/70 px-2 py-0.5 text-xs font-semibold text-ivory">1/{l.photos.length}</span>
        ) : (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-white/85 px-2 py-0.5 text-xs font-medium text-[#162638]">{tx(locale, "Ilustración", "Illustration")}</span>
        )}
      </div>
      <div className={cn("px-5 pb-4 pt-4", compact && "px-4 pb-3.5 pt-3.5")}>
        <div className="flex items-baseline justify-between gap-2">
          <div className={cn("font-serif font-semibold leading-none text-navy", compact ? "text-[24px]" : "text-[27px]")}>
            {money(l.priceAmount, locale)}
            <span className="font-display text-sm font-normal text-muted">{priceSuffix(l, locale)}</span>
          </div>
          <span className="shrink-0 text-sm text-muted">{lbl(TYPE_LABEL[l.listingType], locale)}</span>
        </div>
        <div className="mt-2.5 line-clamp-1 text-[15px] font-semibold text-ink">{tx(locale, l.title_es, l.title_en)}</div>
        <div className="mt-0.5 line-clamp-1 text-sm text-muted">{l.zone}, {l.city}</div>
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line pt-3 text-sm text-muted">
          <span className="flex flex-wrap gap-x-4">
            {factsLine(l, locale).map((f) => (
              <span key={f}>{f}</span>
            ))}
          </span>
          {showCompare && <CompareButton id={l.id} locale={locale} />}
        </div>
        {l.agent?.name && <CardAdvisor agent={l.agent} locale={locale} />}
      </div>
    </Link>
  );
}

export function MapPreviewCard({ l, locale }: { l: Listing; locale: Locale }) {
  return (
    <Link href={`/${locale}/listing/${l.slug}`} className="block overflow-hidden rounded-np bg-white shadow-[0_16px_40px_rgba(22,38,56,.22)] ring-1 ring-black/5">
      <div className="relative aspect-[16/9] bg-arena">
        <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-full w-full" />
        <SaveButton id={l.id} locale={locale} className="absolute right-2 top-2" />
      </div>
      <div className="p-3.5">
        <div className="font-serif text-[22px] font-semibold leading-none text-navy">
          {money(l.priceAmount, locale)}
          <span className="font-display text-sm font-normal text-muted">{priceSuffix(l, locale)}</span>
        </div>
        <div className="mt-1.5 line-clamp-1 text-sm font-semibold">{tx(locale, l.title_es, l.title_en)}</div>
        <div className="text-sm text-muted">{factsLine(l, locale).join(" · ")}</div>
      </div>
    </Link>
  );
}
