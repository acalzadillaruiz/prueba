"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export interface HubSection {
  id: string;
  label: string;
  badge?: number;
}

/**
 * "Tu espacio" section chips: pinned under the header (follows `--np-header-offset`, so it rises when the header
 * slides away), one anchor per section on the page, and scroll-spy marks the section being read (aria-current).
 * On phones the row scrolls sideways and keeps the active chip in view.
 */
export function HubSectionNav({ locale, sections }: { locale: Locale; sections: HubSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((x): x is HTMLElement => !!x);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    // The "reading line" is a band in the upper third of the viewport, under the header and the chips.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        // At the very bottom the last section may never reach the band: it wins there.
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
          setActive(els[els.length - 1].id);
          return;
        }
        const first = sections.find((s) => visible.has(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);
  // Keep the active chip visible inside the sideways-scrolling row (phones). "nearest" on both axes: the row scrolls
  // sideways only as far as needed and the page never jumps vertically (the chip is already on screen, pinned).
  useEffect(() => {
    const chip = document.querySelector<HTMLElement>(`[data-hub-chip="${active}"]`);
    if (!chip) return;
    // Belt and braces: never let it scroll the page (e.g. the row still below the fold on a deep link).
    const r = chip.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    chip.scrollIntoView({ inline: "nearest", block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [active]);
  if (sections.length < 2) return null;
  return (
    <nav
      aria-label={tx(locale, "Secciones de tu espacio", "Sections of your space")}
      data-hub-nav
      className="sticky z-30 -mx-4 mt-6 px-4 transition-[top] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] md:mx-0 md:px-0 top-[calc(env(safe-area-inset-top)+var(--np-header-offset,80px))]"
    >
      <div className="np-glass-nav -mx-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none] md:inline-flex md:max-w-full [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-1">
          {sections.map((s) => {
            const on = s.id === active;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  data-hub-chip={s.id}
                  aria-current={on ? "location" : undefined}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    "flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-4 font-display text-[14px] font-medium transition-colors duration-np focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    on ? "bg-ink text-ivory [html.dark_&]:bg-[#EEF0F2] [html.dark_&]:text-[#1F2328]" : "text-ink/75 hover:bg-black/5 hover:text-ink",
                  )}
                >
                  {s.label}
                  {!!s.badge && (
                    <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold", on ? "bg-[#C3C8CD] text-[#1F2328]" : "bg-navy text-ivory")}>
                      {s.badge}
                      <span className="sr-only">{tx(locale, " sin leer", " unread")}</span>
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
