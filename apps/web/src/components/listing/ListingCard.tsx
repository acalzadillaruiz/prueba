import Link from "next/link";
import { Bath, BedDouble, Car, Maximize2, ShieldCheck } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { PropertyArt } from "@/components/art/PropertyArt";
import { agencyById } from "@/mock/people";
import { TYPE_LABEL, lbl, money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { CompareButton, Freshness, SaveButton, StatusBadge } from "./bits";

export function ListingCard({ l, locale, compact, className, showCompare }: { l: Listing; locale: Locale; compact?: boolean; className?: string; showCompare?: boolean }) {
  const agency = agencyById(l.agencyId);
  const fresh = Date.parse("2026-09-26T18:00:00Z") - Date.parse(l.publishedAt) < 24 * 3600_000;
  const drop = l.priceHistory.find((p) => p.kind === "DROP");
  return (
    <Link
      href={`/${locale}/listing/${l.slug}`}
      className={cn("group block overflow-hidden rounded-np border border-line bg-white transition-shadow duration-np hover:shadow-np", l.luxury && "ring-1 ring-gold/60", className)}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-navy">
        <PropertyArt scene={l.scenes[0]} seed={l.id} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" label={tx(locale, l.title_es, l.title_en)} />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {l.status !== "ACTIVE" && <StatusBadge status={l.status} locale={locale} />}
          {fresh && l.status === "ACTIVE" && <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">{tx(locale, "Nuevo hoy", "New today")}</span>}
          {l.luxury && <span className="rounded-full bg-navy px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gold">Luxury</span>}
          {drop && <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-ok">↓ {tx(locale, "Bajó", "Reduced")}</span>}
        </div>
        <SaveButton id={l.id} locale={locale} className="absolute right-2.5 top-2.5" />
        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-navy/80 px-1.5 py-0.5 text-[11px] font-semibold text-ivory">1/{l.scenes.length}</span>
      </div>
      <div className={cn("p-3.5", compact && "p-3")}>
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-display text-xl font-semibold text-navy">
            {money(l.priceAmount, locale)}
            <span className="text-sm font-normal text-ink/50">{priceSuffix(l, locale)}</span>
          </div>
          <span className="text-xs font-semibold text-ink/50">{lbl(TYPE_LABEL[l.listingType], locale)}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/70">
          {l.beds > 0 && (
            <span className="inline-flex items-center gap-1"><BedDouble size={14} /> {l.beds}</span>
          )}
          {l.baths > 0 && (
            <span className="inline-flex items-center gap-1"><Bath size={14} /> {l.baths}</span>
          )}
          <span className="inline-flex items-center gap-1"><Maximize2 size={13} /> {num(l.areaM2, locale)} m²</span>
          {l.parking > 0 && (
            <span className="inline-flex items-center gap-1"><Car size={14} /> {l.parking}</span>
          )}
        </div>
        <div className="mt-1.5 line-clamp-1 font-semibold text-ink">{tx(locale, l.title_es, l.title_en)}</div>
        <div className="line-clamp-1 text-sm text-ink/60">{l.zone}, {l.city}</div>
        {!compact && (
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-ink/60">
            <span className="inline-flex items-center gap-1 text-xs">
              {agency ? (
                <>
                  {agency.verified && <ShieldCheck size={13} className="text-ok" />} {agency.name}
                </>
              ) : (
                tx(locale, "Dueño directo", "By owner")
              )}
            </span>
            {showCompare ? <CompareButton id={l.id} locale={locale} /> : <Freshness iso={l.updatedAt} locale={locale} />}
          </div>
        )}
      </div>
    </Link>
  );
}

export function MapPreviewCard({ l, locale }: { l: Listing; locale: Locale }) {
  return (
    <Link href={`/${locale}/listing/${l.slug}`} className="block overflow-hidden rounded-np bg-white shadow-np ring-1 ring-black/5">
      <div className="relative aspect-[16/9]">
        <PropertyArt scene={l.scenes[0]} seed={l.id} className="h-full w-full" />
        <SaveButton id={l.id} locale={locale} className="absolute right-2 top-2 h-8 w-8" />
      </div>
      <div className="p-3">
        <div className="font-display text-lg font-semibold text-navy">
          {money(l.priceAmount, locale)}
          <span className="text-xs font-normal text-ink/50">{priceSuffix(l, locale)}</span>
        </div>
        <div className="text-sm text-ink/70">
          {l.beds > 0 && `${l.beds} ${tx(locale, "hab", "bd")} · `}
          {l.baths > 0 && `${l.baths} ${tx(locale, "baños", "ba")} · `}
          {l.areaM2} m²
        </div>
        <div className="line-clamp-1 text-sm font-semibold">{tx(locale, l.title_es, l.title_en)}</div>
      </div>
    </Link>
  );
}
