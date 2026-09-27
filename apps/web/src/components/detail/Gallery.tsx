"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Camera, ChevronLeft, ChevronRight, Film, LayoutPanelTop, MapPinned, X } from "lucide-react";
import type { Listing, Locale } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { Floorplan, PropertyArt } from "@/components/art/PropertyArt";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

type Tab = "photos" | "plan" | "video" | "tour" | "street";

export function Gallery({ l, locale, luxury }: { l: Listing; locale: Locale; luxury?: boolean }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const opener = useRef<HTMLElement | null>(null);
  // Real uploaded photos replace the illustrations entirely (no mixing, no empty cells).
  const shots = l.photos?.length ? l.photos.map((_, n) => l.scenes[n % l.scenes.length]) : l.scenes;
  const total = shots.length;
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
  const tabs: [Tab, React.ElementType, string, boolean][] = [
    ["photos", Camera, `${total} ${tx(locale, "fotos", "photos")}`, true],
    ["plan", LayoutPanelTop, tx(locale, "Plano", "Floor plan"), l.hasFloorplan],
    ["video", Film, "Video", l.hasVideo],
    ["tour", Box, tx(locale, "Tour 360°", "360° tour"), l.hasVirtualTour],
    ["street", MapPinned, tx(locale, "Vista de calle", "Street view"), true],
  ];
  return (
    <>
      {luxury ? (
        <button onClick={() => show(0)} className="relative block h-[72vh] max-h-[760px] w-full overflow-hidden" aria-label={tx(locale, `Ver foto 1 de ${total}`, `View photo 1 of ${total}`)}>
          <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} sizes="100vw" priority className="h-full w-full" />
        </button>
      ) : (
        <div className="grid h-[300px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-np md:h-[460px]">
          <button onClick={() => show(0)} className={cn("col-span-4 row-span-2 overflow-hidden", total > 1 && "md:col-span-2")} aria-label={tx(locale, `Ver foto 1 de ${total}`, `View photo 1 of ${total}`)}>
            <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} sizes="(max-width: 768px) 100vw, 50vw" priority className="h-full w-full transition-transform duration-500 hover:scale-[1.02]" />
          </button>
          {shots.slice(1, 5).map((s, n, arr) => (
            <button key={n} onClick={() => show(n + 1)} className={cn("relative hidden overflow-hidden md:block", arr.length === 1 && "col-span-2 row-span-2", arr.length === 2 && "col-span-2", arr.length === 3 && n === 2 && "col-span-2")} aria-label={tx(locale, `Ver foto ${n + 2} de ${total}`, `View photo ${n + 2} of ${total}`)}>
              <PropertyArt scene={s} seed={l.id + n} photo={listingPhoto(l, n + 1)} className="h-full w-full transition-transform duration-500 hover:scale-[1.03]" />
              {n === 3 && total > 5 && (
                <span className="absolute inset-0 flex items-center justify-center bg-navy/55 font-display text-lg text-ivory">
                  +{total - 5} {tx(locale, "fotos", "photos")}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className={cn("mt-3 flex flex-wrap gap-2", luxury && "mx-auto max-w-[1200px] px-4 md:px-6")}>
        {tabs.filter((t) => t[3]).map(([k, Icon, label]) => (
          <button
            key={k}
            onClick={() => show(0, k)}
            className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 font-display text-sm transition-colors duration-np", luxury ? "border-gold/50 text-ivory hover:bg-white/5" : "border-line bg-white hover:border-navy/40")}
          >
            <Icon size={15} aria-hidden /> {label}
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-navy/97 bg-[#0B1220F7] text-ivory" role="dialog" aria-modal="true" aria-label={tx(locale, l.title_es, l.title_en)}>
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-3">
            {tabs.filter((t) => t[3]).map(([k, Icon, label]) => (
              <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={cn("inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 font-display text-sm", tab === k ? "bg-ivory text-navy" : "text-ivory/75 hover:bg-white/10")}>
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
                <PropertyArt scene={shots[i]} seed={i === 0 ? l.id : l.id + (i - 1)} photo={listingPhoto(l, i)} className="max-h-full w-full max-w-5xl rounded-np" />
                <button onClick={() => setI((i - 1 + total) % total)} aria-label={tx(locale, "Foto anterior", "Previous photo")} className="absolute left-3 rounded-full bg-white/10 p-3 hover:bg-white/20"><ChevronLeft aria-hidden /></button>
                <button onClick={() => setI((i + 1) % total)} aria-label={tx(locale, "Foto siguiente", "Next photo")} className="absolute right-3 rounded-full bg-white/10 p-3 hover:bg-white/20"><ChevronRight aria-hidden /></button>
                <span className="sr-only" aria-live="polite">{tx(locale, `Foto ${i + 1} de ${total}`, `Photo ${i + 1} of ${total}`)}</span>
              </>
            )}
            {tab === "plan" && <Floorplan seed={l.id} beds={l.beds} className="max-h-full w-full max-w-4xl rounded-np" />}
            {(tab === "video" || tab === "tour") && (
              <div className="relative w-full max-w-5xl">
                <PropertyArt scene={l.scenes[1] ?? l.scenes[0]} seed={l.id + "v"} photo={listingPhoto(l, 1) ?? listingPhoto(l, 0)} className="w-full rounded-np opacity-60" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-coral shadow-np">{tab === "video" ? <Film size={32} /> : <Box size={32} />}</span>
                  <span className="font-display text-lg">{tab === "video" ? tx(locale, "Video del inmueble · 1:42", "Property video · 1:42") : tx(locale, "Tour virtual 360° (enlace externo)", "360° virtual tour (external link)")}</span>
                </div>
              </div>
            )}
            {tab === "street" && (
              <div className="relative w-full max-w-5xl">
                <PropertyArt scene={l.kind === "house" || l.kind === "villa" ? "house-dusk" : "tower-day"} seed={l.id + "s"} photo={listingPhoto(l, 0)} className="w-full rounded-np" />
                <span className="absolute left-3 top-3 rounded-full bg-navy/80 px-3 py-1 text-sm">Google Street View · {l.address}</span>
              </div>
            )}
          </div>
          {tab === "photos" && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
              {shots.map((s, n) => (
                <button key={n} onClick={() => setI(n)} aria-label={tx(locale, `Foto ${n + 1} de ${total}`, `Photo ${n + 1} of ${total}`)} aria-current={n === i || undefined} className={cn("h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2", n === i ? "ring-coral" : "ring-transparent opacity-60")}>
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
