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

/** Height of whatever is pinned to the bottom of a phone screen (tab bar, listing contact bar, search sheet), so the tray sits above it. */
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

/**
 * Persistent comparator tray: shows up as soon as one home is picked with "Comparar" (no account needed, the list
 * lives on the device) and links to /compare with the chosen ids. Hidden on the comparison page itself.
 */
export function CompareTray({ locale }: { locale: Locale }) {
  const { compare, toggleCompare, clearCompare } = useApp();
  const pathname = usePathname();
  const inset = useBottomInset();
  const { items } = useListingsByIds(compare);
  if (!compare.length || /\/compare\/?$/.test(pathname)) return null;
  const href = `/${locale}/compare?ids=${compare.map(encodeURIComponent).join(",")}`;
  return (
    <aside
      aria-label={tx(locale, "Comparador", "Compare tray")}
      className="np-in fixed inset-x-3 z-[45] mx-auto max-w-[560px] print:hidden sm:inset-x-6"
      style={{ bottom: `calc(${inset}px + 0.75rem + ${inset ? "0px" : "env(safe-area-inset-bottom)"})` }}
      data-compare-tray
    >
      <div className="np-glass flex items-center gap-3 rounded-[20px] p-2.5 pl-3 shadow-[0_18px_40px_-16px_rgba(30,26,24,.35)]">
        <ul className="flex shrink-0 gap-1.5" aria-label={tx(locale, "Casas para comparar", "Homes to compare")}>
          {[0, 1, 2].map((i) => {
            const id = compare[i];
            const l = items.find((x) => x.id === id);
            if (!id)
              return (
                <li key={`empty-${i}`} aria-hidden className="hidden h-11 w-11 rounded-xl border border-dashed border-[#C2A988] sm:block" />
              );
            const title = l ? tx(locale, l.title_es, l.title_en) : "";
            return (
              <li key={id} className="relative h-10 w-10 sm:h-11 sm:w-11">
                {l ? <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} sizes="44px" className="h-full w-full overflow-hidden rounded-xl" /> : <div className="np-skeleton h-full w-full rounded-xl" />}
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
            compare.length > 1 ? "bg-navy text-ivory hover:bg-navy-2" : "border-[1.5px] border-navy text-navy hover:bg-navy/5",
          )}
        >
          {tx(locale, "Ver", "View")}<span className="hidden sm:inline">{tx(locale, " comparación", " comparison")}</span> <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
