"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Circle, PenLine, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export type MapMode = "pan" | "draw" | "radius";

/**
 * Top-left tool row of the search maps: ONE "Delimitar zona" button whose small menu offers "Dibujar zona" and
 * "Radio 1,2 km" (two pills used to sit on top of the pins), then whatever the page adds (`toolbar`, e.g. the
 * Caracas / Venezuela switch). While drawing, the same spot says what to do next and a tap cancels.
 */
export function ShapeTools({
  locale,
  mode,
  onMode,
  draftCount,
  onClosePoly,
  onClear,
  enabled,
  ctl,
  ctlHover,
  toolbar,
}: {
  locale: Locale;
  mode: MapMode;
  onMode: (m: MapMode) => void;
  draftCount: number;
  onClosePoly: () => void;
  /** Present when an area is set: shows "Quitar zona". */
  onClear?: () => void;
  /** The page can filter by a drawn area (otherwise only `toolbar` shows). */
  enabled: boolean;
  ctl: string;
  ctlHover: string;
  toolbar?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = `${useId().replace(/:/g, "")}-tools`;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      ref.current?.querySelector<HTMLButtonElement>("[aria-haspopup]")?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!enabled && !toolbar) return null;
  const pillCls = "flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 font-display text-sm shadow-np transition-colors duration-np";
  const items = [
    ["draw", PenLine, tx(locale, "Dibujar zona", "Draw an area"), tx(locale, "Toca el mapa punto a punto", "Tap the map point by point")],
    ["radius", Circle, tx(locale, "Radio 1,2 km", "1.2 km radius"), tx(locale, "Toca el centro en el mapa", "Tap the centre on the map")],
  ] as const;

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-wrap items-start gap-2 pr-16">
      {enabled && (
        <div ref={ref} className="relative">
          {mode === "pan" ? (
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? menuId : undefined}
              className={cn(pillCls, open ? "np-sel" : cn(ctl, ctlHover))}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((o) => !o);
              }}
            >
              <PenLine size={14} aria-hidden />
              <span className="sm:hidden">{tx(locale, "Zona", "Area")}</span>
              <span className="hidden sm:inline">{tx(locale, "Delimitar zona", "Mark an area")}</span>
              <ChevronDown size={14} aria-hidden className={cn("transition-transform duration-np", open && "rotate-180")} />
            </button>
          ) : (
            <button
              type="button"
              aria-pressed
              className={cn(pillCls, "np-sel")}
              onClick={(e) => {
                e.stopPropagation();
                onMode("pan");
              }}
            >
              {mode === "draw" ? <PenLine size={14} aria-hidden /> : <Circle size={14} aria-hidden />}
              {mode === "draw" ? tx(locale, "Toca para dibujar…", "Tap to draw…") : tx(locale, "Toca el centro…", "Tap the centre…")}
              <X size={14} aria-hidden className="opacity-70" />
              <span className="sr-only">{tx(locale, "(cancelar)", "(cancel)")}</span>
            </button>
          )}
          {open && mode === "pan" && (
            <div id={menuId} role="menu" aria-label={tx(locale, "Delimitar zona", "Mark an area")} className={cn("np-in absolute left-0 top-[calc(100%+6px)] z-20 w-60 rounded-2xl border p-1.5 shadow-np", ctl)}>
              {items.map(([m, Icon, label, hint]) => (
                <button
                  key={m}
                  type="button"
                  role="menuitem"
                  className={cn("flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left font-display text-sm", ctlHover)}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                    e.preventDefault();
                    const all = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
                    const i = all.indexOf(e.currentTarget);
                    all[(i + (e.key === "ArrowDown" ? 1 : all.length - 1)) % all.length]?.focus();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onMode(m);
                  }}
                >
                  <Icon size={15} aria-hidden className="shrink-0" />
                  <span className="leading-tight">
                    {label}
                    <span className="block text-[12px] opacity-70">{hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {enabled && mode === "draw" && draftCount >= 3 && (
        <button
          type="button"
          className="np-btn-navy min-h-11 rounded-full bg-navy px-4 font-display text-sm font-semibold text-ivory shadow-np"
          onClick={(e) => {
            e.stopPropagation();
            onClosePoly();
          }}
        >
          {tx(locale, "Cerrar zona", "Close area")} ({draftCount})
        </button>
      )}
      {enabled && onClear && mode === "pan" && (
        <button
          type="button"
          className={cn(pillCls, "gap-1", ctl, ctlHover)}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          <X size={14} aria-hidden /> {tx(locale, "Quitar zona", "Clear area")}
        </button>
      )}
      {mode === "pan" && toolbar}
    </div>
  );
}
