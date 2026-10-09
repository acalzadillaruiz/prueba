"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Camera, ChevronLeft, ChevronRight, ExternalLink, LayoutPanelTop, MapPinned, X } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { Floorplan, PropertyArt } from "@/components/art/PropertyArt";
import { plural, tx } from "@/lib/i18n";
import { GOOGLE_MAPS_KEY } from "@/components/map/config";
import { cn } from "@/lib/cn";

type Tab = "photos" | "plan" | "street";

/** Only https links are opened (the API validates the same on write). */
const safeTour = (u?: string | null) => (u && /^https:\/\//i.test(u) ? u : null);

export function Gallery({ l, locale }: { l: Listing; locale: Locale; luxury?: boolean }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const opener = useRef<HTMLElement | null>(null);
  // Real uploaded photos replace the illustrations entirely (no mixing, no empty cells).
  const illustrated = !l.photos?.length;
  const shots = illustrated ? l.scenes : l.photos!.map((_, n) => l.scenes[n % l.scenes.length]);
  const total = shots.length;
  // Without real photos the gallery shows brand illustrations: say so (never "6 fotos" for drawings).
  const what = (n: number) => (illustrated ? tx(locale, `ilustración ${n} de ${total}`, `illustration ${n} of ${total}`) : tx(locale, `foto ${n} de ${total}`, `photo ${n} of ${total}`));
  const What = (n: number) => what(n).replace(/^./, (c) => c.toUpperCase());
  const view = (n: number) => tx(locale, `Ver ${what(n)}`, `View ${what(n)}`);
  // Descriptive alt for the photos shown on their own (title + zone); thumbnails inside labelled buttons stay decorative.
  const alt = `${tx(locale, l.title_es, l.title_en)}, ${l.zone}`;
  const tour = safeTour(l.virtualTourUrl);
  const dialog = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") setI((x) => (x + 1) % total);
      else if (e.key === "ArrowLeft") setI((x) => (x - 1 + total) % total);
      else if (e.key === "Tab" && dialog.current) {
        // Focus trap: Tab / Shift+Tab cycle inside the viewer.
        const f = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])')).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        const inside = dialog.current.contains(document.activeElement);
        if (e.shiftKey && (document.activeElement === first || !inside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      // Give focus back to the control that opened the viewer.
      opener.current?.focus();
    };
  }, [open, total]);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    swipe.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s0 = swipe.current;
    const t = e.changedTouches[0];
    swipe.current = null;
    if (!s0 || !t || total < 2) return;
    const dx = t.clientX - s0.x;
    const dy = t.clientY - s0.y;
    // A clear horizontal flick only (vertical drags and taps do nothing).
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    setI((x) => (dx < 0 ? (x + 1) % total : (x - 1 + total) % total));
  };
  const [tab, setTab] = useState<Tab>("photos");
  // Phone hero carousel: the photo on screen, and how many are mounted (the first up front, then one step ahead).
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(1);
  const ahead = (n: number) => setLoaded((v) => Math.max(v, Math.min(total, n + 2)));
  const show = (n: number, t: Tab = "photos") => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setI(n);
    setTab(t);
    setOpen(true);
  };
  // Only media that really exists: no video player without a video, Street View only with a Maps key.
  const tabs: [Tab, React.ElementType, string, boolean][] = [
    ["photos", Camera, illustrated ? tx(locale, "Ilustraciones", "Illustrations") : plural(total, locale, ["foto", "fotos"], ["photo", "photos"]), true],
    ["plan", LayoutPanelTop, tx(locale, "Plano orientativo", "Indicative floor plan"), l.hasFloorplan],
    ["street", MapPinned, tx(locale, "Vista de calle", "Street view"), !!GOOGLE_MAPS_KEY],
  ];
  const tag = illustrated && (
    <span className="pointer-events-none absolute bottom-4 left-4 np-glass rounded-full px-3 py-1 font-display text-[13px] text-ink">{tx(locale, "Ilustración · aún sin fotos reales", "Illustration · real photos to come")}</span>
  );
  const thumbs = shots.slice(1, 5);
  const allLabel = illustrated ? tx(locale, `Ver las ${total} ilustraciones`, `View all ${total} illustrations`) : tx(locale, `Ver las ${total} fotos`, `View all ${total} photos`);
  // With three pictures or fewer every one is already on screen: no "Ver las 3 fotos" overlay.
  const showAll = total > 3;
  const chip = "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink/10 bg-white/75 px-4 font-display text-sm text-ink transition-colors duration-np hover:border-navy/40";
  return (
    <>
      {/* Main photo with the brand's arched top-left corner; four thumbnails on the right (desktop). Phones: the main photo
          is a swipeable scroll-snap carousel of every picture (dots + "1 / N"); a tap opens the viewer on the photo shown. */}
      <div className={cn("grid h-[320px] gap-3 sm:h-[420px] md:h-[min(540px,60vh)] lg:h-[clamp(380px,55vh,600px)]", thumbs.length > 0 && "md:grid-cols-2")}>
        <div className="relative overflow-hidden rounded-[32px] bg-arena" data-testid="gallery-hero">
          <div
            ref={track}
            onTouchStart={() => ahead(idx)}
            onScroll={(e) => {
              const el = e.currentTarget;
              const n = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
              if (n !== idx) setIdx(n);
              ahead(n);
            }}
            className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain md:overflow-hidden"
          >
            {shots.map((sc, n) => (
              <button
                key={n}
                type="button"
                onClick={() => show(n)}
                // Only the photo on screen is in the tab order; from md up only the first one exists (thumbnails do the rest).
                tabIndex={n === idx ? 0 : -1}
                className={cn("relative block h-full w-full shrink-0 snap-start snap-always overflow-hidden", n > 0 && "md:hidden")}
              >
                <span className="sr-only">{view(n + 1)}</span>
                {n < loaded && (
                  <PropertyArt
                    scene={sc}
                    seed={n === 0 ? l.id : l.id + (n - 1)}
                    photo={listingPhoto(l, n)}
                    label={n === 0 ? alt : `${alt} · ${what(n + 1)}`}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={n === 0}
                    className="h-full w-full transition-transform duration-700 hover:scale-[1.02]"
                  />
                )}
              </button>
            ))}
          </div>
          {illustrated && (
            <span className="pointer-events-none absolute left-4 top-4 np-glass rounded-full px-3 py-1 font-display text-[13px] text-ink md:bottom-4 md:top-auto">{tx(locale, "Ilustración · aún sin fotos reales", "Illustration · real photos to come")}</span>
          )}
          {total > 1 && (
            <>
              <span aria-hidden data-testid="gallery-hero-counter" className="pointer-events-none absolute right-3 top-3 np-glass rounded-full px-3 py-1 font-display text-[13px] font-semibold tabular-nums text-ink md:hidden">
                {idx + 1} / {total}
              </span>
              <div aria-hidden className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 md:hidden">
                {shots.map((_, n) => (
                  <span key={n} className={cn("h-1.5 rounded-full shadow-[0_0_2px_rgba(30,26,24,.5)] transition-all duration-np", n === idx ? "w-3 bg-white" : "w-1.5 bg-white/60")} />
                ))}
              </div>
              <span className="sr-only md:hidden" aria-live="polite">{What(idx + 1)}</span>
            </>
          )}
        </div>
        {thumbs.length > 0 && (
          <div className={cn("hidden gap-3 md:grid", thumbs.length > 1 ? "grid-cols-2" : "grid-cols-1", thumbs.length > 2 ? "grid-rows-2" : "grid-rows-1")}>
            {thumbs.map((sc, n, arr) => (
              <button
                key={n}
                onClick={() => show(n + 1)}
                className={cn(
                  "relative overflow-hidden rounded-[24px] bg-arena",
                  arr.length === 3 && n === 2 && "col-span-2",
                )}
                aria-label={n === arr.length - 1 ? undefined : view(n + 2)}
              >
                {n === arr.length - 1 && <span className="sr-only">{view(n + 2)}</span>}
                <PropertyArt scene={sc} seed={l.id + n} photo={listingPhoto(l, n + 1)} className="h-full w-full transition-transform duration-700 hover:scale-[1.03]" />
                {showAll && n === arr.length - 1 && (
                  <span className="absolute bottom-4 right-4 np-glass rounded-full px-4 py-2 font-display text-[14px] font-semibold text-ink">
                    {allLabel}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.filter((t) => t[3]).map(([k, Icon, label]) => (
          <button key={k} onClick={() => show(0, k)} className={chip}>
            <Icon size={15} aria-hidden /> {label}
          </button>
        ))}
        {tour && (
          <a href={tour} target="_blank" rel="noopener noreferrer" className={chip}>
            <Box size={15} aria-hidden /> {tx(locale, "Tour 360°", "360° tour")}
            <ExternalLink size={13} aria-hidden />
            <span className="sr-only">{tx(locale, "(se abre en una pestaña nueva)", "(opens in a new tab)")}</span>
          </a>
        )}
      </div>

      {open && (
        <div ref={dialog} className="fixed inset-0 z-[60] flex flex-col bg-[#0d0b0a] text-ivory" role="dialog" aria-modal="true" aria-label={tx(locale, l.title_es, l.title_en)} data-testid="gallery-lightbox">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-3">
            {tabs.filter((t) => t[3]).map(([k, Icon, label]) => (
              <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={cn("inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 font-display text-sm", tab === k ? "border-2 border-ivory bg-white/15 text-ivory" : "border-2 border-transparent text-ivory/75 hover:bg-white/10")}>
                <Icon size={15} aria-hidden /> {label}
              </button>
            ))}
            {tab === "photos" && total > 1 && (
              <span className="ml-auto shrink-0 px-2 font-display text-sm tabular-nums text-ivory/80" aria-hidden data-testid="gallery-counter">
                {i + 1} / {total}
              </span>
            )}
            <button autoFocus onClick={() => setOpen(false)} className={cn(!(tab === "photos" && total > 1) && "ml-auto", "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20")} aria-label={tx(locale, "Cerrar", "Close")}>
              <X aria-hidden />
            </button>
          </div>
          <div className={cn("relative flex min-h-0 flex-1 items-center justify-center", tab === "photos" ? "md:px-20" : "px-4 md:px-16")}>
            {tab === "photos" && (
              <>
                {/* Photos: object-contain at the full available height. Illustrations (SVG, 4:3) keep their frame. */}
                <div className="flex h-full w-full touch-pan-y select-none items-center justify-center" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                  <div className={cn("relative", listingPhoto(l, i) ? "h-full w-full" : "aspect-[4/3] w-[min(100%,calc((100dvh-180px)*4/3))]")}>
                    <PropertyArt scene={shots[i]} seed={i === 0 ? l.id : l.id + (i - 1)} photo={listingPhoto(l, i)} label={`${alt} · ${what(i + 1)}`} sizes="100vw" className="h-full w-full !object-contain" />
                    {tag}
                  </div>
                </div>
                {total > 1 && (
                  <>
                    <button onClick={() => setI((i - 1 + total) % total)} aria-label={tx(locale, "Foto anterior", "Previous photo")} className="absolute left-3 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex"><ChevronLeft aria-hidden /></button>
                    <button onClick={() => setI((i + 1) % total)} aria-label={tx(locale, "Foto siguiente", "Next photo")} className="absolute right-3 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex"><ChevronRight aria-hidden /></button>
                  </>
                )}
                <span className="sr-only" aria-live="polite">{What(i + 1)}</span>
              </>
            )}
            {tab === "plan" && (
              <figure className="w-full max-w-4xl">
                <Floorplan seed={l.id} beds={l.beds} className="max-h-[70vh] w-full rounded-np" />
                <figcaption className="mt-2 text-center text-sm text-mist">{tx(locale, "Plano orientativo: muestra la distribución aproximada y no está a escala. Pide el plano final a quien la publica.", "Indicative floor plan: an approximate layout, not to scale. Ask the lister for the final plan.")}</figcaption>
              </figure>
            )}
            {tab === "street" && GOOGLE_MAPS_KEY && (
              <iframe
                title={tx(locale, `Vista de calle · ${l.address}`, `Street view · ${l.address}`)}
                src={`https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&location=${l.lat},${l.lng}&fov=80`}
                className="aspect-video max-h-full w-full max-w-5xl rounded-np border-0 bg-navy"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            )}
          </div>
          {tab === "photos" && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
              {shots.map((s, n) => (
                <button key={n} onClick={() => setI(n)} aria-label={What(n + 1)} aria-current={n === i || undefined} className={cn("h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2", n === i ? "ring-[#C9A574]" : "ring-transparent opacity-60")}>
                  <PropertyArt scene={s} seed={n === 0 ? l.id : l.id + (n - 1)} photo={listingPhoto(l, n)} className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
