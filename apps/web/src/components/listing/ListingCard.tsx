import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Avatar, Badge } from "@/components/ui";
import { TYPE_LABEL, lbl, money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { CardCompareToggle, CompareButton, SaveButton, StatusBadge } from "./bits";
import { CardPhotos } from "./CardPhotos";

/** "5 hab. · 6 baños · 620 m²" (metadata line, ≥ 14 px). */
export function factsLine(l: Pick<Listing, "beds" | "baths" | "areaM2">, locale: Locale) {
  return [
    l.beds > 0 && `${l.beds} ${tx(locale, "hab.", l.beds === 1 ? "bed" : "beds")}`,
    l.baths > 0 && `${l.baths} ${tx(locale, l.baths === 1 ? "baño" : "baños", l.baths === 1 ? "bath" : "baths")}`,
    `${num(l.areaM2, locale)} m²`,
  ].filter(Boolean) as string[];
}

/** Brand badges on the photo: Exclusive (luxury) → status → new → view. Two at most, calm. */
function PhotoBadges({ l, locale, roomRight }: { l: Listing; locale: Locale; roomRight?: boolean }) {
  const fresh = Date.now() - Date.parse(l.publishedAt) < 24 * 3600_000;
  const drop = l.priceHistory?.some((p) => p.kind === "DROP");
  const out: React.ReactNode[] = [];
  if (l.luxury) out.push(<Badge key="x" tone="exclusive">{tx(locale, "Exclusiva New Place", "New Place exclusive")}</Badge>);
  if (l.status !== "ACTIVE") out.push(<StatusBadge key="s" status={l.status} locale={locale} />);
  if (fresh && l.status === "ACTIVE") out.push(<Badge key="n" tone="arena">{tx(locale, "Nuevo", "New")}</Badge>);
  if (drop) out.push(<Badge key="d" tone="arena">{tx(locale, "Bajó de precio", "Price cut")}</Badge>);
  if (l.amenities?.includes("view")) out.push(<Badge key="v" tone="egeo">{tx(locale, "Con vista", "With a view")}</Badge>);
  // Room on the right for the heart (and, on touch screens, the compare button next to it).
  return <div className={cn("pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5", roomRight ? "max-w-[calc(100%-4.5rem)] [@media(hover:none)]:max-w-[calc(100%-7.5rem)]" : "max-w-[calc(100%-4.5rem)]")}>{out.slice(0, 2)}</div>;
}

/** Listed by its owner (no agency, no agent): the card says so instead of passing the owner off as an advisor. */
export const isOwnerListing = (l: Pick<Listing, "agentId" | "agencyId">) => !l.agentId && !l.agencyId;

/**
 * Card footer: the assigned advisor (small avatar, name, verified tick) — or, for a home its owner publishes, "Propietaria/o
 * · sin intermediarios" (no name: the owner is not an advisor). Quiet by design (muted, one line).
 */
export function CardAdvisor({ agent, locale, owner }: { agent: NonNullable<Listing["agent"]>; locale: Locale; owner?: boolean }) {
  const initials = agent.name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  const label = tx(locale, "Asesor/a verificado/a", "Verified advisor");
  if (owner)
    return (
      <div className="mt-2.5 flex min-w-0 items-center gap-2 text-sm text-muted" data-testid="card-advisor" data-owner>
        <span aria-hidden className="contents"><Avatar initials={initials} hue={agent.hue} size={24} /></span>
        <span className="truncate">{tx(locale, "Propietaria/o · sin intermediarios", "Owner · no middlemen")}</span>
      </div>
    );
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

/**
 * `compareToggle` (search results): a compare button on the photo (icon next to the heart on touch, "Comparar" on
 * hover with a mouse). `showCompare`: the older footer pill (saved homes).
 */
export function ListingCard({ l, locale, compact, className, showCompare, compareToggle }: { l: Listing; locale: Locale; compact?: boolean; className?: string; showCompare?: boolean; compareToggle?: boolean }) {
  const label = `${tx(locale, l.title_es, l.title_en)}, ${l.zone}`;
  return (
    <Link
      href={`/${locale}/listing/${l.slug}`}
      data-spotlight
      className={cn("group block rounded-[28px] bg-white/75 p-2 ring-1 ring-black/[.04] shadow-[0_1px_2px_rgba(30,26,24,.04),0_14px_34px_-14px_rgba(30,26,24,.18)] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(30,26,24,.05),0_28px_50px_-18px_rgba(30,26,24,.28)]", className)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-arena">
        <CardPhotos l={l} locale={locale} label={label} />
        <PhotoBadges l={l} locale={locale} roomRight={compareToggle} />
        <SaveButton id={l.id} locale={locale} className="absolute right-2.5 top-2.5" />
        {compareToggle && <CardCompareToggle id={l.id} locale={locale} />}
        {/* Honest label for illustration-only listings. Several photos: dots on the carousel (no static "1/N"). */}
        {!l.photos?.length && (
          <span className="np-glass pointer-events-none absolute bottom-2.5 right-2.5 rounded-full px-2.5 py-0.5 font-display text-xs font-medium text-ink">{tx(locale, "Ilustración", "Illustration")}</span>
        )}
      </div>
      <div className={cn("px-3.5 pb-3 pt-4", compact && "px-3 pb-2.5 pt-3.5")}>
        <div className="flex items-baseline justify-between gap-2">
          <div className={cn("font-serif leading-none tracking-[-0.01em] text-ink", compact ? "text-[24px]" : "text-[28px]")}>
            {money(l.priceAmount, locale)}
            <span className="font-display text-sm font-normal text-muted">{priceSuffix(l, locale)}</span>
          </div>
          <span className="shrink-0 text-sm text-muted">{lbl(TYPE_LABEL[l.listingType], locale)}</span>
        </div>
        <div className="mt-2.5 line-clamp-1 text-[15px] font-semibold text-ink">{tx(locale, l.title_es, l.title_en)}</div>
        <div className="mt-0.5 line-clamp-1 text-sm text-muted">{l.zone}, {l.city}</div>
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-ink/[.07] pt-3 text-sm text-muted">
          <span className="flex flex-wrap gap-x-4">
            {factsLine(l, locale).map((f) => (
              <span key={f}>{f}</span>
            ))}
          </span>
          {showCompare && <CompareButton id={l.id} locale={locale} />}
        </div>
        {l.agent?.name && <CardAdvisor agent={l.agent} locale={locale} owner={isOwnerListing(l)} />}
      </div>
    </Link>
  );
}

/** Map pin preview: a "card" floating by the pin (md and up) or a compact "sheet" row (phones' bottom sheet). */
export function MapPreviewCard({ l, locale, variant = "card" }: { l: Listing; locale: Locale; variant?: "card" | "sheet" }) {
  const label = `${tx(locale, l.title_es, l.title_en)}, ${l.zone}`;
  if (variant === "sheet")
    return (
      <Link href={`/${locale}/listing/${l.slug}`} className="relative flex h-[120px] gap-3 overflow-hidden rounded-[20px] bg-white p-1.5 ring-1 ring-black/[.05]">
        <div className="relative w-[40%] max-w-[160px] shrink-0 overflow-hidden rounded-[15px] bg-arena">
          <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-full w-full" label={label} sizes="160px" />
        </div>
        <div className="min-w-0 flex-1 py-1.5 pr-12">
          <div className="font-serif text-[20px] leading-none text-ink [font-feature-settings:'lnum']">
            {money(l.priceAmount, locale)}
            <span className="font-display text-[13px] font-normal text-muted">{priceSuffix(l, locale)}</span>
          </div>
          <div className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-snug text-ink">{tx(locale, l.title_es, l.title_en)}</div>
          <div className="mt-0.5 truncate text-[13px] text-muted">{factsLine(l, locale).join(" · ")}</div>
        </div>
        <SaveButton id={l.id} locale={locale} className="absolute right-1.5 top-1.5" />
      </Link>
    );
  return (
    <Link href={`/${locale}/listing/${l.slug}`} className="np-glass block overflow-hidden rounded-[24px] p-1.5">
      <div className="relative aspect-[16/9] overflow-hidden rounded-[18px] bg-arena">
        <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-full w-full" label={label} sizes="256px" />
        <SaveButton id={l.id} locale={locale} className="absolute right-2 top-2" />
      </div>
      <div className="p-3.5">
        <div className="font-serif text-[22px] leading-none text-ink">
          {money(l.priceAmount, locale)}
          <span className="font-display text-sm font-normal text-muted">{priceSuffix(l, locale)}</span>
        </div>
        <div className="mt-1.5 line-clamp-1 text-sm font-semibold">{tx(locale, l.title_es, l.title_en)}</div>
        <div className="text-sm text-muted">{factsLine(l, locale).join(" · ")}</div>
      </div>
    </Link>
  );
}
