"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Camera, ChevronLeft, ChevronRight, ExternalLink, LayoutPanelTop, MapPinned, X } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { Floorplan, PropertyArt } from "@/components/art/PropertyArt";
import { tx } from "@/lib/i18n";
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
  const tour = safeTour(l.virtualTourUrl);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") setI((x) => (x + 1) % total);
      else if (e.key === "ArrowLeft") setI((x) => (x - 1 + total) % total);
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
  const [tab, setTab] = useState<Tab>("photos");
  const show = (n: number, t: Tab = "photos") => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setI(n);
    setTab(t);
    setOpen(true);
  };
  // Only media that really exists: no video player without a video, Street View only with a Maps key.
  const tabs: [Tab, React.ElementType, string, boolean][] = [
    ["photos", Camera, illustrated ? tx(locale, "Ilustraciones", "Illustrations") : `${total} ${tx(locale, "fotos", "photos")}`, true],
    ["plan", LayoutPanelTop, tx(locale, "Plano orientativo", "Indicative floor plan"), l.hasFloorplan],
    ["street", MapPinned, tx(locale, "Vista de calle", "Street view"), !!GOOGLE_MAPS_KEY],
  ];
  const tag = illustrated && (
    <span className="pointer-events-none absolute bottom-4 left-4 np-glass rounded-full px-3 py-1 font-display text-[13px] text-ink">{tx(locale, "Ilustración · aún sin fotos reales", "Illustration · real photos to come")}</span>
  );
  const thumbs = shots.slice(1, 5);
  const allLabel = illustrated ? tx(locale, `Ver las ${total} ilustraciones`, `View all ${total} illustrations`) : tx(locale, `Ver las ${total} fotos`, `View all ${total} photos`);
  const chip = "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink/10 bg-white/75 px-4 font-display text-sm text-ink transition-colors duration-np hover:border-navy/40";
  return (
    <>
      {/* Main photo with the brand's arched top-left corner; four thumbnails on the right (desktop). */}
      <div className={cn("grid h-[320px] gap-3 sm:h-[420px] md:h-[540px] lg:h-[600px]", thumbs.length > 0 && "md:grid-cols-2")}>
        <button onClick={() => show(0)} className="relative block overflow-hidden rounded-[32px] bg-arena">
          <span className="sr-only">{view(1)}</span>
          <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} sizes="(max-width: 768px) 100vw, 50vw" priority className="h-full w-full transition-transform duration-700 hover:scale-[1.02]" />
          {tag}
          <span className="absolute right-3 top-3 np-glass rounded-full px-3.5 py-1.5 font-display text-[13px] font-semibold text-ink md:hidden">{allLabel}</span>
        </button>
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
                {n === arr.length - 1 && (
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
        <div className="fixed inset-0 z-[60] flex flex-col bg-navy/97 bg-[#1E1A18F7] text-ivory" role="dialog" aria-modal="true" aria-label={tx(locale, l.title_es, l.title_en)}>
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-3">
            {tabs.filter((t) => t[3]).map(([k, Icon, label]) => (
              <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={cn("inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 font-display text-sm", tab === k ? "border-2 border-ivory bg-white/15 text-ivory" : "border-2 border-transparent text-ivory/75 hover:bg-white/10")}>
                <Icon size={15} aria-hidden /> {label}
              </button>
            ))}
            <button autoFocus onClick={() => setOpen(false)} className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10" aria-label={tx(locale, "Cerrar", "Close")}>
              <X aria-hidden />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-16">
            {tab === "photos" && (
              <>
                <div className="relative max-h-full w-full max-w-5xl">
                  <PropertyArt scene={shots[i]} seed={i === 0 ? l.id : l.id + (i - 1)} photo={listingPhoto(l, i)} className="max-h-full w-full rounded-np" />
                  {tag}
                </div>
                <button onClick={() => setI((i - 1 + total) % total)} aria-label={tx(locale, "Foto anterior", "Previous photo")} className="absolute left-3 rounded-full bg-white/10 p-3 hover:bg-white/20"><ChevronLeft aria-hidden /></button>
                <button onClick={() => setI((i + 1) % total)} aria-label={tx(locale, "Foto siguiente", "Next photo")} className="absolute right-3 rounded-full bg-white/10 p-3 hover:bg-white/20"><ChevronRight aria-hidden /></button>
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
