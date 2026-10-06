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
        photos.forEach((ph, i) => (ph.style.transform = `translate3d(${(p * items.length - i) * -6}%,0,0) scale(1.18)`));
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
    <section ref={root} className="relative bg-ivory" aria-label={title}>
      <div className="flex flex-col justify-center overflow-hidden py-20 md:sticky md:top-0 md:h-[100svh] md:py-0">
        <div className="mx-auto mb-8 flex w-full max-w-[1320px] items-end justify-between gap-6 px-4 md:mb-12 md:px-8">
          <div>
            <p className="np-eyebrow text-gold-text">{eyebrow}</p>
            <h2 className="mt-3 text-[38px] leading-[1.02] md:text-[60px]">{title}</h2>
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
            <Link key={it.href} href={it.href} className="group w-[78vw] shrink-0 snap-start sm:w-[46vw] md:w-[34vw] lg:w-[28vw] xl:w-[400px]">
              <span className="np-arch relative block aspect-[4/5] overflow-hidden bg-arena">
                {it.photo && (
                  <span data-drift className="absolute inset-0 block scale-[1.18] will-change-transform">
                    <Image src={it.photo} alt="" fill sizes="(max-width: 768px) 78vw, 400px" className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]" />
                  </span>
                )}
                <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,38,56,0)_55%,rgba(22,38,56,.55)_100%)]" aria-hidden />
                {it.badge && <span className="absolute left-1/2 top-[18%] -translate-x-1/2 rounded-full bg-[#F8F5EFEE] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#162638]">{it.badge}</span>}
                <span className="absolute bottom-4 left-5 font-serif text-[64px] leading-none text-ivory/90" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </span>
              <span className="mt-5 block font-serif text-[24px] leading-tight text-ink transition-colors group-hover:text-[#A8452A] md:text-[27px]">{it.title}</span>
              <span className="mt-1 block text-sm text-muted">
                {it.zone} · {it.facts}
              </span>
              <span className="mt-2 block font-display text-[16px] font-semibold text-ink">{it.price}</span>
            </Link>
          ))}
          <Link href={more.href} className="group flex w-[60vw] shrink-0 snap-start items-center justify-center sm:w-[36vw] md:w-[26vw] lg:w-[300px]">
            <span className="np-arch flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 border border-ink/15 text-center transition-colors group-hover:border-ink">
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
