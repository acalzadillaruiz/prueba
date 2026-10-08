"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Scale, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import { PropertyArt } from "@/components/art/PropertyArt";
import { useApp } from "@/lib/store";
import { listingPhoto } from "@/lib/photos";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { useListingsByIds } from "./useListingsByIds";

/** /compare link for the chosen ids. */
export const compareHref = (locale: Locale, ids: string[]) => `/${locale}/compare?ids=${ids.map(encodeURIComponent).join(",")}`;

/** Listing detail pages carry the comparator inline (sticky contact bar chip on phones, a link in the action row): no floating tray there. */
export const isListingPath = (p: string | null) => !!p && /^\/(?:es|en)\/(?:listing|preview)\//.test(p);

/** Height of whatever is pinned to the bottom of a phone screen (tab bar, search sheet), so the tray sits above it. */
function useBottomInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const measure = () => {
      let h = 0;
      document.querySelectorAll<HTMLElement>('[data-tabbar], [data-sticky-cta="shown"]').forEach((el) => {
        if (getComputedStyle(el).display === "none") return;
        h = Math.max(h, el.getBoundingClientRect().height);
      });
      // Search on phones: sit above the results sheet while it peeks (over the map), not over the list.
      const sheet = document.querySelector<HTMLElement>('[data-search-sheet="peek"]');
      if (sheet && window.innerWidth < 1024) h = Math.max(h, window.innerHeight - sheet.getBoundingClientRect().top);
      setInset(h);
    };
    measure();
    let t = 0;
    // Bars and the sheet animate: measure now and once more when the transition is over.
    const mo = new MutationObserver(() => {
      measure();
      window.clearTimeout(t);
      t = window.setTimeout(measure, 350);
    });
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-sticky-cta", "data-search-sheet"] });
    window.addEventListener("resize", measure);
    return () => {
      mo.disconnect();
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);
  return inset;
}

const isField = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || (el.matches("input, textarea, select") && !el.matches('[type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="range"]')));

/**
 * Steps out of the way: while the visitor types in a form field (the on-screen keyboard is up, the form needs the room)
 * and while a contact panel or form marked [data-hide-compare] is on screen.
 */
function useStepAside() {
  const [typing, setTyping] = useState(false);
  const [overForm, setOverForm] = useState(false);
  useEffect(() => {
    const onIn = (e: FocusEvent) => setTyping(isField(e.target));
    const onOut = () => window.setTimeout(() => setTyping(isField(document.activeElement)), 0);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    let io: IntersectionObserver | null = null;
    const targets = [...document.querySelectorAll("#contact, [data-hide-compare]")];
    if (targets.length && typeof IntersectionObserver !== "undefined") {
      const visible = new Set<Element>();
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setOverForm(visible.size > 0);
      });
      targets.forEach((t) => io!.observe(t));
    }
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
      io?.disconnect();
    };
  }, []);
  return typing || overForm;
}

/**
 * Persistent comparator: shows up as soon as one home is picked with "Comparar" (no account needed, the list lives on
 * the device) and links to /compare with the chosen ids. Phones: a slim bar above the tab bar. Tablets and desktop: a
 * compact pill in the bottom-right corner that never spans the content. Hidden on the comparison page, on listing
 * pages (they carry it inline), while a form field has focus and while a contact form is on screen.
 */
export function CompareTray({ locale }: { locale: Locale }) {
  const { compare, toggleCompare, clearCompare } = useApp();
  const pathname = usePathname();
  const inset = useBottomInset();
  const aside = useStepAside();
  const { items } = useListingsByIds(compare);
  if (!compare.length || /\/compare\/?$/.test(pathname) || isListingPath(pathname)) return null;
  const href = compareHref(locale, compare);
  const ready = compare.length > 1;
  const thumb = (id: string, size: string) => {
    const l = items.find((x) => x.id === id);
    return l ? <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} sizes="44px" className={cn("overflow-hidden", size)} /> : <div className={cn("np-skeleton", size)} />;
  };
  return (
    <aside
      aria-label={tx(locale, "Comparador", "Compare tray")}
      aria-hidden={aside || undefined}
      // The floating contact buttons step up while the tray is shown (globals.css keys on [data-compare-tray]).
      {...(aside ? { "data-compare-tray-hidden": "" } : { "data-compare-tray": "" })}
      inert={aside || undefined}
      className={cn(
        "fixed z-[45] transition-[opacity,transform] duration-300 print:hidden",
        "inset-x-3 mx-auto max-w-[560px] sm:inset-x-6 md:inset-x-auto md:right-8 md:mx-0 md:max-w-none",
        aside ? "pointer-events-none translate-y-4 opacity-0" : "np-in",
      )}
      style={{ bottom: `calc(${inset}px + 0.75rem + ${inset ? "0px" : "env(safe-area-inset-bottom)"})` }}
    >
      {/* Phones: slim bar with the chosen homes. */}
      <div className="np-glass flex items-center gap-3 rounded-[20px] p-2.5 pl-3 shadow-[0_18px_40px_-16px_rgba(30,26,24,.35)] md:hidden">
        <ul className="flex shrink-0 gap-1.5" aria-label={tx(locale, "Casas para comparar", "Homes to compare")}>
          {compare.slice(0, 3).map((id) => {
            const l = items.find((x) => x.id === id);
            const title = l ? tx(locale, l.title_es, l.title_en) : "";
            return (
              <li key={id} className="relative h-10 w-10">
                {thumb(id, "h-full w-full rounded-xl")}
                <button
                  type="button"
                  onClick={() => toggleCompare(id)}
                  aria-label={title ? tx(locale, `Quitar «${title}» del comparador`, `Remove “${title}” from compare`) : tx(locale, "Quitar del comparador", "Remove from compare")}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-ink shadow ring-1 ring-black/10 after:absolute after:-inset-2.5 after:content-['']"
                >
                  <X size={11} strokeWidth={2.2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5 font-display text-[14px] font-semibold text-ink">
            <Scale size={14} aria-hidden className="shrink-0 text-[#8E3B22]" />
            <span aria-live="polite">{tx(locale, `Comparar (${compare.length}/3)`, `Compare (${compare.length}/3)`)}</span>
          </div>
          <button type="button" onClick={clearCompare} className="mt-0.5 text-[12px] text-muted underline-offset-4 hover:underline">
            {tx(locale, "Vaciar", "Clear")}
          </button>
        </div>
        <Link
          href={href}
          aria-label={tx(locale, "Ver comparación", "View comparison")}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-4 font-display text-[14px] font-semibold transition-colors duration-np",
            ready ? "bg-navy text-ivory hover:bg-navy-2" : "border-[1.5px] border-navy text-navy hover:bg-navy/5",
          )}
        >
          {tx(locale, "Ver", "View")} <ArrowRight size={15} aria-hidden />
        </Link>
      </div>

      {/* Tablets and desktop: a compact corner pill (stacked thumbnails · count · view · clear). */}
      <div className="np-glass hidden items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-1.5 shadow-[0_18px_40px_-16px_rgba(30,26,24,.35)] md:flex">
        <ul className="flex -space-x-2.5 pl-0.5" aria-hidden>
          {compare.slice(0, 3).map((id) => (
            <li key={id} className="h-9 w-9 rounded-full ring-2 ring-[#F1EBE3]">
              {thumb(id, "h-full w-full rounded-full")}
            </li>
          ))}
        </ul>
        <span className="flex items-center gap-1.5 whitespace-nowrap font-display text-[14px] font-semibold text-ink">
          <Scale size={14} aria-hidden className="shrink-0 text-[#8E3B22]" />
          <span aria-live="polite">{tx(locale, `Comparar (${compare.length}/3)`, `Compare (${compare.length}/3)`)}</span>
        </span>
        <Link
          href={href}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-4 font-display text-[14px] font-semibold transition-colors duration-np",
            ready ? "bg-navy text-ivory hover:bg-navy-2" : "border-[1.5px] border-navy text-navy hover:bg-navy/5",
          )}
        >
          {tx(locale, "Ver comparación", "View comparison")} <ArrowRight size={15} aria-hidden />
        </Link>
        <button
          type="button"
          onClick={clearCompare}
          aria-label={tx(locale, "Vaciar el comparador", "Clear the comparison")}
          title={tx(locale, "Vaciar", "Clear")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-np hover:bg-black/5 hover:text-ink"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </aside>
  );
}

/**
 * Inline comparator link for pages that skip the floating tray (listing detail): "Ver comparación (2)".
 * Renders nothing until at least one home is picked.
 */
export function CompareLink({ locale, className }: { locale: Locale; className?: string }) {
  const { compare } = useApp();
  if (!compare.length) return null;
  return (
    <Link href={compareHref(locale, compare)} className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-display text-[13px] font-semibold text-navy underline-offset-4 hover:underline", className)}>
      {tx(locale, `Ver comparación (${compare.length})`, `View comparison (${compare.length})`)} <ArrowRight size={14} aria-hidden />
    </Link>
  );
}
