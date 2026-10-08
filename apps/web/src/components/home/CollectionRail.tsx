"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { scrubSection, useReducedMotion } from "./motion";

export type RailItem = { href: string; title: string; zone: string; price: string; facts: string; photo?: string; badge?: string };

/**
 * Colección Privada as a horizontal gallery: the section pins and the residences glide sideways with the
 * scroll, each photo drifting inside its arch (parallax). Phones and reduced motion get a native swipe row.
 */
export function CollectionRail({ eyebrow, title, items, more }: { eyebrow: string; title: string; items: RailItem[]; more: { href: string; label: string } }) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    const tr = track.current;
    if (reduced || !el || !tr) return;
    const mq = window.matchMedia("(min-width: 768px)");
    let off: (() => void) | undefined;
    const setup = () => {
      off?.();
      off = undefined;
      tr.style.transform = "";
      el.style.height = "";
      if (!mq.matches) return;
      // The section is as tall as the horizontal travel, so one screen of scroll = one screen sideways.
      const travel = () => Math.max(0, tr.scrollWidth - window.innerWidth + 64);
      el.style.height = `${travel() + window.innerHeight}px`;
      const photos = Array.from(tr.querySelectorAll<HTMLElement>("[data-drift]"));
      off = scrubSection(el, (p) => {
        tr.style.transform = `translate3d(${-travel() * p}px,0,0)`;
        // Drift clamped to ±8 % inside a 1.25× photo (12.5 % spare per side): the arch never shows its beige backing.
        photos.forEach((ph, i) => (ph.style.transform = `translate3d(${Math.max(-8, Math.min(8, (p * items.length - i) * -6))}%,0,0) scale(1.25)`));
        if (counter.current) counter.current.textContent = String(Math.min(items.length, 1 + Math.floor(p * items.length * 0.999))).padStart(2, "0");
        if (bar.current) bar.current.style.transform = `scaleX(${Math.max(0.04, p)})`;
      });
    };
    setup();
    mq.addEventListener("change", setup);
    window.addEventListener("resize", setup);
    return () => {
      off?.();
      mq.removeEventListener("change", setup);
      window.removeEventListener("resize", setup);
    };
  }, [reduced, items.length]);

  return (
    // data-hide-fab: the floating contact button steps away while the cards glide under its corner.
    <section ref={root} data-hide-fab className="relative bg-ivory" aria-label={title}>
      <div className="flex flex-col justify-center overflow-hidden py-10 md:sticky md:top-0 md:h-[100svh] md:py-0">
        <div className="mx-auto mb-5 flex w-full max-w-[1320px] items-end justify-between gap-6 px-4 md:mb-12 md:px-8">
          <div>
            <p className="np-kicker text-gold-text">{eyebrow}</p>
            <h2 className="mt-2 text-[32px] leading-[1.02] tracking-[-0.02em] md:mt-3 md:text-[60px]">{title}</h2>
          </div>
          <div className="hidden items-center gap-4 md:flex" aria-hidden>
            <span className="font-display text-[13px] font-semibold tracking-[0.2em] text-muted">
              <span ref={counter} className="text-ink">01</span> / {String(items.length).padStart(2, "0")}
            </span>
            <span className="relative block h-[2px] w-40 bg-line">
              <span ref={bar} className="absolute inset-0 origin-left scale-x-[0.04] bg-ink" />
            </span>
          </div>
        </div>
        <div
          ref={track}
          className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 will-change-transform md:snap-none md:gap-8 md:overflow-visible md:px-8 md:pl-[max(2rem,calc((100vw-1320px)/2+2rem))]"
        >
          {items.map((it, i) => (
            <Link key={it.href} href={it.href} data-spotlight className="group relative w-[72vw] shrink-0 snap-start overflow-hidden rounded-[32px] bg-arena sm:w-[46vw] md:w-[34vw] lg:w-[28vw] xl:w-[420px]">
              <span className="relative block aspect-[4/5] overflow-hidden">
                {it.photo && (
                  <span data-drift className="absolute inset-0 block scale-[1.25] will-change-transform">
                    <Image src={it.photo} alt="" fill sizes="(max-width: 768px) 78vw, 420px" className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
                  </span>
                )}
                <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,26,24,0)_45%,rgba(30,26,24,.35)_100%)]" aria-hidden />
                <span className="np-glass absolute left-4 top-4 rounded-full px-3 py-1 font-display text-[12px] font-medium text-ink">
                  {String(i + 1).padStart(2, "0")}{it.badge ? ` · ${it.badge}` : ""}
                </span>
                <span className="np-glass absolute inset-x-3 bottom-3 block rounded-[22px] p-4 transition-transform duration-500 group-hover:-translate-y-1">
                  <span className="block truncate font-serif text-[22px] leading-tight text-ink md:text-[24px]">{it.title}</span>
                  <span className="mt-0.5 block truncate font-display text-[13px] text-ink/60">
                    {it.zone} · {it.facts}
                  </span>
                  <span className="mt-2 flex items-center justify-between font-display text-[15px] font-semibold text-ink">
                    {it.price}
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-ivory transition-transform duration-300 group-hover:rotate-[-45deg]" aria-hidden>→</span>
                  </span>
                </span>
              </span>
            </Link>
          ))}
          <Link href={more.href} className="group flex w-[52vw] shrink-0 snap-start items-center justify-center sm:w-[36vw] md:w-[26vw] lg:w-[300px]">
            <span className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-[32px] border border-ink/15 text-center transition-colors group-hover:border-ink group-hover:bg-white/50">
              <span className="font-serif text-[30px] leading-tight text-ink">{more.label}</span>
              <span className="text-[22px] text-ink transition-transform group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </span>
          </Link>
          <span className="w-4 shrink-0 md:w-8" aria-hidden />
        </div>
      </div>
    </section>
  );
}
