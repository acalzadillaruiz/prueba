import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Avatar, Badge } from "@/components/ui";
import { TYPE_LABEL, lbl, money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { CardCompareToggle, SaveButton, StatusBadge } from "./bits";
import { CardPhotos } from "./CardPhotos";

/** "5 hab. · 6 baños · 620 m²" (metadata line, ≥ 14 px). */
export function factsLine(l: Pick<Listing, "beds" | "baths" | "areaM2">, locale: Locale) {
  return [
    l.beds > 0 && `${l.beds} ${tx(locale, "hab.", l.beds === 1 ? "bed" : "beds")}`,
    l.baths > 0 && `${l.baths} ${tx(locale, l.baths === 1 ? "baño" : "baños", l.baths === 1 ? "bath" : "baths")}`,
    `${num(l.areaM2, locale)} m²`,
  ].filter(Boolean) as string[];
}

/**
 * ONE brand badge on the photo, by priority: a status that changes what you can do (coming soon, under offer) →
 * Exclusive (luxury) → price cut → new → view. It truncates rather than run under the heart / compare buttons.
 */
function PhotoBadge({ l, locale, roomRight, compact }: { l: Listing; locale: Locale; roomRight?: boolean; compact?: boolean }) {
  const fresh = Date.now() - Date.parse(l.publishedAt) < 24 * 3600_000;
  const drop = l.priceHistory?.some((p) => p.kind === "DROP");
  const fit = (text: string) => <span className="min-w-0 truncate">{text}</span>;
  const badge =
    l.status !== "ACTIVE" ? <StatusBadge status={l.status} locale={locale} className="max-w-full" />
    : l.luxury ? <Badge tone="exclusive" className="max-w-full">{fit(compact ? tx(locale, "Exclusiva", "Exclusive") : tx(locale, "Exclusiva New Place", "New Place exclusive"))}</Badge>
    : drop ? <Badge tone="arena" className="max-w-full">{fit(tx(locale, "Bajó de precio", "Price cut"))}</Badge>
    : fresh ? <Badge tone="arena" className="max-w-full">{fit(tx(locale, "Nuevo", "New"))}</Badge>
    : l.amenities?.includes("view") ? <Badge tone="egeo" className="max-w-full">{fit(tx(locale, "Con vista", "With a view"))}</Badge>
    : null;
  if (!badge) return null;
  // Room on the right for the heart (and, on touch screens, the compare button next to it).
  return (
    <div data-card-badge className={cn("pointer-events-none absolute left-3 top-3 z-[2] flex min-w-0", roomRight ? "max-w-[calc(100%-4.5rem)] [@media(hover:none)]:max-w-[calc(100%-7.5rem)]" : "max-w-[calc(100%-4.5rem)]")}>
      {badge}
    </div>
  );
}

/** Listed by its owner (no agency, no agent): the card says so instead of passing the owner off as an advisor. */
export const isOwnerListing = (l: Pick<Listing, "agentId" | "agencyId">) => !l.agentId && !l.agencyId;

/**
 * Card footer: the assigned advisor (small avatar, name, verified tick) — or, for a home its owner publishes, "Dueño/a
 * · sin intermediarios" (no name: the owner is not an advisor). Quiet by design (muted, one line).
 */
export function CardAdvisor({ agent, locale, owner }: { agent: NonNullable<Listing["agent"]>; locale: Locale; owner?: boolean }) {
  const initials = agent.name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
  const label = tx(locale, "Asesor/a verificado/a", "Verified advisor");
  if (owner)
    return (
      <div className="mt-2.5 flex min-w-0 items-center gap-2 text-sm text-muted" data-testid="card-advisor" data-owner>
        <span aria-hidden className="contents"><Avatar initials={initials} hue={agent.hue} size={24} /></span>
        <span className="truncate">{tx(locale, "Dueño/a · sin intermediarios", "Owner · no middlemen")}</span>
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
 * Price size by the card's own width (container query units, see .np-card-price in globals.css): the price fills the
 * row it has — a 3-column grid at 1280 px gets a smaller "USD 2.300.000" than a phone's full-width card — and never
 * wraps or runs into what follows. The vars give the text's length (in em at ~0.7 em a glyph — NP Digits figures are 0.7 em) and the suffix's room.
 */
const priceVars = (price: string, suffix: string, compact?: boolean) =>
  ({
    "--np-pk": (price.length * 0.7).toFixed(2),
    "--np-sfx": `${Math.ceil(suffix.length * 6.6)}px`,
    "--np-pmax": compact ? "24px" : "28px",
  }) as React.CSSProperties;

/**
 * Listing card, "stretched link" pattern: an <article> whose ONLY link is the title; its ::after covers the whole
 * card, so a click anywhere (photo included) opens the listing, while the heart, compare and photo arrows are
 * sibling buttons stacked above it (no buttons inside a link, and the link's name is just the title — price and
 * place come through aria-describedby). On touch screens the photo strip sits above the link too (so it can be
 * swiped) and a tap on it opens the listing.
 *
 * `compareToggle`: a compare button on the photo (icon next to the heart on touch, "Comparar" on hover with a
 * mouse) — search results and saved homes alike. Compact cards (search, similar homes) leave out the operation
 * ("Venta"): the search already filters by it, and the price gets the whole row.
 */
export function ListingCard({ l, locale, compact, className, compareToggle }: { l: Listing; locale: Locale; compact?: boolean; className?: string; compareToggle?: boolean }) {
  const price = money(l.priceAmount, locale);
  const suffix = priceSuffix(l, locale);
  const title = tx(locale, l.title_es, l.title_en);
  const label = `${title}, ${l.zone}`;
  const href = `/${locale}/listing/${l.slug}`;
  const metaId = `card-${l.id}-meta`;
  return (
    <article
      data-spotlight
      data-listing-card
      className={cn(
        "group relative isolate rounded-[28px] bg-white/75 p-2 ring-1 ring-black/[.04] shadow-[0_1px_2px_rgba(30,26,24,.04),0_14px_34px_-14px_rgba(30,26,24,.18)] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(30,26,24,.05),0_28px_50px_-18px_rgba(30,26,24,.28)] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-navy has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-ivory",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-arena">
        <CardPhotos l={l} locale={locale} label={label} href={href} />
        <PhotoBadge l={l} locale={locale} roomRight={compareToggle} compact={compact} />
        <SaveButton id={l.id} locale={locale} className="absolute right-2.5 top-2.5 z-[2]" />
        {compareToggle && <CardCompareToggle id={l.id} locale={locale} />}
        {/* Honest label for illustration-only listings. Several photos: dots on the carousel (no static "1/N"). */}
        {!l.photos?.length && (
          <span className="np-glass pointer-events-none absolute bottom-2.5 right-2.5 z-[2] rounded-full px-2.5 py-0.5 font-display text-xs font-medium text-ink">{tx(locale, "Ilustración", "Illustration")}</span>
        )}
      </div>
      <div className={cn("px-3.5 pb-3 pt-4", compact && "px-3 pb-2.5 pt-3.5")}>
        <div className="np-card-meta flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1" id={metaId}>
          <div className="np-card-price np-num min-w-0 whitespace-nowrap leading-none tracking-[-0.01em] text-ink" style={priceVars(price, suffix, compact)}>
            {price}
            <span className="font-display text-sm font-normal text-muted">{suffix}</span>
            <span className="sr-only">, {l.zone}, {l.city}</span>
          </div>
          {!compact && <span className="shrink-0 text-sm text-muted">{lbl(TYPE_LABEL[l.listingType], locale)}</span>}
        </div>
        {/* Two lines (3 columns at 1280 cut most titles at one); from md the grid reserves both lines so cards in a row stay aligned. */}
        <div className="mt-2.5 line-clamp-2 text-[15px] font-semibold leading-snug text-ink md:min-h-[2.75em]">
          <Link
            href={href}
            aria-describedby={metaId}
            className="outline-none after:absolute after:inset-0 after:z-[1] after:rounded-[28px] after:content-['']"
          >
            {title}
          </Link>
        </div>
        <div className="mt-0.5 line-clamp-1 text-sm text-muted">{l.zone}, {l.city}</div>
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-ink/[.07] pt-3 text-sm text-muted">
          <span className="flex flex-wrap gap-x-4">
            {factsLine(l, locale).map((f) => (
              <span key={f}>{f}</span>
            ))}
          </span>
        </div>
        {l.agent?.name && <CardAdvisor agent={l.agent} locale={locale} owner={isOwnerListing(l)} />}
      </div>
    </article>
  );
}

/**
 * Map pin preview: a "card" floating by the pin (md and up) or a compact "sheet" row (phones' bottom sheet). Same
 * stretched-link pattern as ListingCard: the title is the link, the heart a sibling button above it.
 */
export function MapPreviewCard({ l, locale, variant = "card" }: { l: Listing; locale: Locale; variant?: "card" | "sheet" }) {
  const title = tx(locale, l.title_es, l.title_en);
  const label = `${title}, ${l.zone}`;
  const href = `/${locale}/listing/${l.slug}`;
  const metaId = `map-${variant}-${l.id}-meta`;
  const link = (
    <Link href={href} aria-describedby={metaId} className="outline-none after:absolute after:inset-0 after:z-[1] after:rounded-[inherit] after:content-['']">
      {title}
    </Link>
  );
  if (variant === "sheet")
    return (
      <article className="relative isolate flex h-[120px] gap-3 overflow-hidden rounded-[20px] bg-white p-1.5 ring-1 ring-black/[.05] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-navy">
        <div className="relative w-[40%] max-w-[160px] shrink-0 overflow-hidden rounded-[15px] bg-arena">
          <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-full w-full" label={label} sizes="160px" />
        </div>
        <div className="min-w-0 flex-1 py-1.5 pr-12">
          <div id={metaId} className="np-num whitespace-nowrap text-[20px] leading-none text-ink">
            {money(l.priceAmount, locale)}
            <span className="font-display text-[13px] font-normal text-muted">{priceSuffix(l, locale)}</span>
          </div>
          <div className="mt-1.5 line-clamp-2 text-[14px] font-semibold leading-snug text-ink">{link}</div>
          <div className="mt-0.5 truncate text-[13px] text-muted">{factsLine(l, locale).join(" · ")}</div>
        </div>
        <SaveButton id={l.id} locale={locale} className="absolute right-1.5 top-1.5 z-[2]" />
      </article>
    );
  return (
    <article className="np-glass relative isolate overflow-hidden rounded-[24px] p-1.5 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-navy">
      <div className="relative aspect-[16/9] overflow-hidden rounded-[18px] bg-arena">
        <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-full w-full" label={label} sizes="256px" />
        <SaveButton id={l.id} locale={locale} className="absolute right-2 top-2 z-[2]" />
      </div>
      <div className="p-3.5">
        <div id={metaId} className="np-num whitespace-nowrap text-[22px] leading-none text-ink">
          {money(l.priceAmount, locale)}
          <span className="font-display text-sm font-normal text-muted">{priceSuffix(l, locale)}</span>
        </div>
        <div className="mt-1.5 line-clamp-1 text-sm font-semibold">{link}</div>
        <div className="text-sm text-muted">{factsLine(l, locale).join(" · ")}</div>
      </div>
    </article>
  );
}
