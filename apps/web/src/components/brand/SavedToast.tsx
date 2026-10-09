"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";

/** Everything that can be pinned to the bottom of the screen under the toast's spot. */
const BOTTOM_CHROME = '[data-tabbar], [data-sticky-cta="shown"], [data-search-toggle] > *, [data-compare-tray], [data-fab]:not([aria-hidden="true"]) > button';

/**
 * Space taken by the floating controls pinned to the bottom of the screen (tab bar, listing sticky bar, the search
 * page's Mapa/Lista toggle, the compare tray, the contact button): the toast sits 12 px above the highest of them.
 * Only boxes in the lower half that share the toast's columns count (the desktop contact button in the corner doesn't),
 * and hidden ones (display: none / zero size / faded out) are skipped.
 */
function bottomInset(toast: HTMLElement | null) {
  const vh = window.innerHeight;
  const own = toast?.getBoundingClientRect();
  let h = 0;
  document.querySelectorAll<HTMLElement>(BOTTOM_CHROME).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || r.top < vh / 2 || r.top >= vh) return;
    if (own && (r.right <= own.left - 8 || r.left >= own.right + 8)) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || Number(cs.opacity) === 0) return;
    h = Math.max(h, vh - r.top);
  });
  return h;
}

/**
 * Quiet confirmation after a heart: "Guardada · Ver guardadas". Bottom centre, above whatever floats there (see
 * `bottomInset`; globals.css `[data-np-toast]` is the first-paint fallback), announced politely, gone after a few
 * seconds or as soon as the route changes. `nonce` changes on every save so a second heart restarts the timer.
 */
export function SavedToast({ locale, nonce, onClose }: { locale: Locale; nonce: number; onClose: () => void }) {
  const [bottom, setBottom] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // It belongs to the page where the heart was tapped: a navigation (listing → Back to the results) dismisses it,
  // so it never lands on top of the next page's cards.
  const pathname = usePathname();
  const shownOn = useRef(pathname);
  useEffect(() => {
    if (pathname !== shownOn.current) onClose();
  }, [pathname, onClose]);
  useEffect(() => {
    const t = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(t);
  }, [nonce, onClose]);
  useEffect(() => {
    const measure = () => {
      const h = bottomInset(box.current);
      setBottom(h ? h + 12 : null);
    };
    measure();
    // The contact button and the bars slide in and out (with the scroll, or after a pause): follow them while the toast is up.
    const t = window.setInterval(measure, 400);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [nonce]);
  return (
    <div
      ref={box}
      data-np-toast
      role="status"
      aria-live="polite"
      style={bottom != null ? { bottom } : undefined}
      className="np-in fixed inset-x-0 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full bg-navy py-2 pl-4 pr-2 font-display text-[15px] text-ivory shadow-[0_0_0_1px_rgba(201,165,116,.45),0_16px_36px_rgba(30,26,24,.32)] transition-[bottom] duration-300 print:hidden"
    >
      <Heart size={16} className="shrink-0 fill-[#C9A574] text-[#C9A574]" aria-hidden />
      <span>{tx(locale, "Guardada", "Saved")}</span>
      <span aria-hidden className="text-ivory/40">·</span>
      <Link href={`/${locale}/saved`} onClick={onClose} className="flex min-h-9 items-center rounded-full px-3 font-semibold text-[#C9A574] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A574]">
        {tx(locale, "Ver guardadas", "See saved")}
      </Link>
    </div>
  );
}
