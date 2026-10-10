"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { scrubSection, useReducedMotion } from "./motion";

export type RailItem = { href: string; title: string; zone: string; price: string; facts: string; photo?: string; badge?: string };

/** Pinning (scroll-driven sideways glide) only on desktops with a mouse/trackpad: on touch (tablets, phones) a pinned
 * section is ~2,400 px of scrolling that goes sideways, so they get a native swipe row instead. Same query as the
 * `[@media(min-width:1024px)_and_(pointer:fine)]:` classes below. */
const PIN_QUERY = "(min-width: 1024px) and (pointer: fine)";

/**
 * Colección Privada as a horizontal gallery: on desktops with a fine pointer the section pins and the residences
 * glide sideways with the scroll, each photo drifting inside its frame (parallax). Touch screens (phones, tablets,
 * touch laptops) and reduced motion get a native swipe row.
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
    const mq = window.matchMedia(PIN_QUERY);
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
        // Drift clamped to ±8 % inside a 1.25× photo (12.5 % spare per side): the frame never shows its backing.
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
    <section ref={root} data-hide-fab className="relative bg-arena" aria-label={title}>
      <div className="flex flex-col justify-center overflow-hidden py-10 md:py-14 [@media(min-width:1024px)_and_(pointer:fine)]:sticky [@media(min-width:1024px)_and_(pointer:fine)]:top-0 [@media(min-width:1024px)_and_(pointer:fine)]:h-[100svh] [@media(min-width:1024px)_and_(pointer:fine)]:py-0">
        <div className="mx-auto mb-5 flex w-full max-w-[1320px] items-end justify-between gap-6 px-4 md:mb-12 md:px-8">
          <div>
            <p className="np-kicker text-gold-text">{eyebrow}</p>
            <h2 className="mt-3 text-[28px] md:mt-4 md:text-[48px]">{title}</h2>
          </div>
          <div className="hidden items-center gap-4 [@media(min-width:1024px)_and_(pointer:fine)]:flex" aria-hidden>
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
          className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 md:scroll-px-8 md:gap-8 md:px-8 md:pl-[max(2rem,calc((100vw-1320px)/2+2rem))] [@media(min-width:1024px)_and_(pointer:fine)]:snap-none [@media(min-width:1024px)_and_(pointer:fine)]:overflow-visible [@media(min-width:1024px)_and_(pointer:fine)]:will-change-transform"
        >
          {items.map((it, i) => (
            <Link key={it.href} href={it.href} className="group relative w-[72vw] shrink-0 snap-start sm:w-[46vw] md:w-[34vw] lg:w-[28vw] xl:w-[420px]">
              <span className="relative block aspect-[4/5] overflow-hidden rounded-[2px] bg-arena">
                {it.photo && (
                  <span data-drift className="absolute inset-0 block scale-[1.25] will-change-transform">
                    <Image src={it.photo} alt="" fill sizes="(max-width: 768px) 78vw, 420px" className="object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.05]" />
                  </span>
                )}
                <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-white/20 px-3 py-1 font-display text-[11px] font-medium uppercase tracking-[.18em] text-white backdrop-blur-md">
                  {String(i + 1).padStart(2, "0")}{it.badge ? ` · ${it.badge}` : ""}
                </span>
              </span>
              <span className="block pt-4">
                <span className="block truncate font-display text-[13.5px] font-medium uppercase tracking-[.12em] text-ink">
                  {it.title} <span className="text-muted">· {it.zone}</span>
                </span>
                <span className="mt-2 block font-serif text-[22px] font-light leading-none text-ink md:text-[24px]">{it.price}</span>
                <span className="mt-2 block truncate font-display text-[13px] text-muted">{it.facts}</span>
              </span>
            </Link>
          ))}
          <Link href={more.href} className="group flex w-[52vw] shrink-0 snap-start items-center justify-center sm:w-[36vw] md:w-[26vw] lg:w-[300px]">
            <span className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-4 rounded-[2px] border border-egeo/60 text-center transition-colors duration-500 group-hover:border-ink group-hover:bg-white/30">
              <span className="px-6 font-display text-[13px] font-medium uppercase tracking-[.2em] text-ink">{more.label}</span>
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
