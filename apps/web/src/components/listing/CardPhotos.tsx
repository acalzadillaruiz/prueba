"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const IMG = "h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]";
/** Cards are at most a third of the screen on desktop, full width on phones. */
const SIZES = "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw";

/**
 * Card photos: a scroll-snap mini carousel when the listing has several photos (swipe on touch, arrows on desktop
 * hover, dots). Only the cover loads up front; the next photo loads as soon as the visitor shows interest (hover,
 * touch, a swipe), the rest one step ahead. The card's title link stretches over the photo: with a mouse a click
 * on the photo is a click on that link. On touch screens the strip sits above it (so it can be swiped) and a tap
 * opens `href`; a swipe scrolls and never navigates (no click after a scroll gesture). One photo or none: a plain
 * image under the link, no "1/1" counter. Unloaded slides show the arena placeholder (dark brown in dark mode).
 */
export function CardPhotos({ l, locale, label, href }: { l: Listing; locale: Locale; label: string; href?: string }) {
  const router = useRouter();
  const n = Math.min(5, l.photos?.length ?? 0);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(1);
  const track = useRef<HTMLDivElement>(null);
  if (n <= 1) return <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className={IMG} label={label} sizes={SIZES} />;

  const ahead = (i: number) => setLoaded((v) => Math.max(v, Math.min(n, i + 2)));
  const go = (e: React.MouseEvent, d: number) => {
    // The arrows page the photos, they never open the listing.
    e.preventDefault();
    e.stopPropagation();
    const el = track.current;
    if (!el) return;
    const i = Math.max(0, Math.min(n - 1, idx + d));
    ahead(i);
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  const arrow = "absolute top-1/2 z-[2] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#ffffffe6] text-[#1C1D1D] opacity-0 shadow-sm transition-opacity duration-np group-hover:opacity-100 disabled:!opacity-0 [@media(hover:none)]:hidden";
  return (
    <>
      <div
        ref={track}
        onPointerEnter={() => ahead(idx)}
        onTouchStart={() => ahead(idx)}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          if (i !== idx) setIdx(i);
          ahead(i);
        }}
        // Touch only (with a mouse the stretched link is on top and gets the click).
        onClick={href ? () => router.push(href) : undefined}
        // Not a Tab stop (browsers make scrollers focusable): the keyboard opens the listing through the title link,
        // and the strip is named for screen readers.
        tabIndex={-1}
        role="group"
        aria-roledescription={tx(locale, "carrusel", "carousel")}
        aria-label={tx(locale, `Fotos de ${label}`, `Photos of ${label}`)}
        className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [@media(hover:none)]:relative [@media(hover:none)]:z-[2]"
      >
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-arena">
            {i < loaded && (
              <PropertyArt
                scene={l.scenes[i % l.scenes.length] ?? l.scenes[0]}
                seed={l.id}
                photo={listingPhoto(l, i)}
                className={IMG}
                sizes={SIZES}
                label={i === 0 ? label : `${label} · ${tx(locale, `foto ${i + 1} de ${n}`, `photo ${i + 1} of ${n}`)}`}
              />
            )}
          </div>
        ))}
      </div>
      <button type="button" tabIndex={-1} disabled={idx === 0} onClick={(e) => go(e, -1)} onPointerEnter={() => ahead(idx)} aria-label={tx(locale, "Foto anterior", "Previous photo")} className={cn(arrow, "left-2.5")}>
        <ChevronLeft size={18} aria-hidden />
      </button>
      <button type="button" tabIndex={-1} disabled={idx === n - 1} onClick={(e) => go(e, 1)} onPointerEnter={() => ahead(idx)} aria-label={tx(locale, "Foto siguiente", "Next photo")} className={cn(arrow, "right-2.5")}>
        <ChevronRight size={18} aria-hidden />
      </button>
      <div aria-hidden data-photo-dots className="pointer-events-none absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-1.5">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={cn("h-1.5 rounded-full shadow-[0_0_2px_rgba(28,29,29,.5)] transition-all duration-np", i === idx ? "w-3 bg-white" : "w-1.5 bg-white/60")} />
        ))}
      </div>
      <span className="sr-only" aria-live="polite">{tx(locale, `Foto ${idx + 1} de ${n}`, `Photo ${idx + 1} of ${n}`)}</span>
    </>
  );
}
