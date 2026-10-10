"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ease, gsap, scrubSection, span, useReducedMotion } from "./motion";

/**
 * Cinematic hero: the camera walks through the arch and out to the sea while you scroll.
 * Layers: the marina (behind) and the arched hall (front). The hall scales up from the arch opening
 * and dissolves; the intro copy lifts away; a second line lands over the sea.
 * Reduced motion: a regular one-screen hero (the hall photo with the copy and the search).
 */
export function HeroCinema({
  eyebrow,
  title,
  titleEm,
  lede,
  search,
  arrival,
  arrivalSub,
  scrollHint,
}: {
  eyebrow: string;
  title: string;
  titleEm: string;
  lede: string;
  search: React.ReactNode;
  arrival: string;
  arrivalSub: string;
  scrollHint: string;
}) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const hall = useRef<HTMLDivElement>(null);
  const sea = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const outro = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced || !root.current) return;
    // Entrance: the title rises word by word, then the copy and the search.
    const words = intro.current?.querySelectorAll("[data-word]") ?? [];
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(words, { yPercent: 110, opacity: 0, duration: 1.3, stagger: 0.08 })
      .from(intro.current!.querySelectorAll("[data-rise]"), { y: 28, opacity: 0, duration: 1, stagger: 0.12 }, "-=0.9")
      .from(hall.current, { scale: 1.08, duration: 2.4, ease: "power2.out" }, 0);

    const off = scrubSection(root.current, (p) => {
      // Into the arch: scale from its opening, and dissolve before the 1600 px photo starts to soften.
      const zoom = ease(span(p, 0, 0.55));
      if (hall.current) {
        hall.current.style.transform = `scale(${1 + zoom * 2.6})`;
        hall.current.style.opacity = String(1 - span(p, 0.22, 0.48));
        hall.current.style.filter = `blur(${span(p, 0.2, 0.48) * 3}px)`;
      }
      if (sea.current) sea.current.style.transform = `scale(${1.22 - 0.22 * ease(span(p, 0.2, 1))})`;
      if (veil.current) veil.current.style.opacity = String(0.55 + 0.45 * span(p, 0.62, 0.95));
      if (intro.current) {
        const k = span(p, 0.04, 0.26);
        intro.current.style.transform = `translateY(${-90 * k}px)`;
        intro.current.style.opacity = String(1 - k);
        intro.current.style.pointerEvents = k > 0.6 ? "none" : "";
      }
      if (outro.current) {
        const k = ease(span(p, 0.5, 0.78));
        outro.current.style.opacity = String(k);
        outro.current.style.transform = `translateY(${50 * (1 - k)}px)`;
        outro.current.style.letterSpacing = `${0.02 - 0.02 * k}em`;
      }
      if (hint.current) hint.current.style.opacity = String(1 - span(p, 0, 0.08));
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    });
    return () => {
      off();
      tl.kill();
    };
  }, [reduced]);

  const head = (
    <h1 className="np-hero-title mt-4 max-w-[860px] text-[40px] leading-[1.04] text-ivory sm:text-[62px] lg:text-[84px]">
      <span className="block overflow-hidden pb-1">
        {title.split(" ").map((w, i) => (
          <span key={i} data-word className="mr-[0.24em] inline-block">
            {w}
          </span>
        ))}
      </span>
      <em className="block overflow-hidden pb-2">
        {titleEm.split(" ").map((w, i) => (
          <span key={i} data-word className="mr-[0.24em] inline-block">
            {w}
          </span>
        ))}
      </em>
    </h1>
  );

  const copy = (
    <div ref={intro} className="mx-auto flex h-full max-w-[1320px] flex-col justify-end px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[112px] md:px-8 md:pb-10 lg:pb-16">
      <p data-rise className="np-eyebrow text-[12px] tracking-[0.2em] text-ivory/90">{eyebrow}</p>
      {head}
      <p data-rise className="mt-5 max-w-[580px] text-[17px] leading-relaxed text-ivory/85">{lede}</p>
      <div data-rise className="mt-8">{search}</div>
    </div>
  );

  if (reduced)
    return (
      <section className="relative isolate overflow-hidden bg-navy text-ivory">
        <Image src="/brand/hero-costa-atardecer.jpg" alt="" fill priority sizes="100vw" quality={80} className="-z-10 object-cover object-[50%_38%]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(28,29,29,.72)_0%,rgba(28,29,29,.28)_34%,rgba(28,29,29,.45)_62%,rgba(28,29,29,.92)_100%)]" aria-hidden />
        <div className="min-h-[640px] lg:min-h-[min(860px,100svh)]">{copy}</div>
      </section>
    );

  return (
    <section ref={root} className="relative h-[260vh] bg-navy text-ivory" aria-label={eyebrow}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={sea} className="absolute inset-0 will-change-transform" aria-hidden>
          <Image src="/brand/marina.jpg" alt="" fill sizes="100vw" quality={80} className="object-cover" />
        </div>
        <div ref={veil} className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,29,29,.35)_0%,rgba(28,29,29,.05)_40%,rgba(28,29,29,.75)_100%)]" style={{ opacity: 0.55 }} aria-hidden />
        <div ref={hall} className="absolute inset-0 origin-[50%_44%] will-change-transform" aria-hidden>
          <Image src="/brand/hero-costa-atardecer.jpg" alt="" fill priority sizes="100vw" quality={80} className="object-cover object-[50%_38%]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,29,29,.7)_0%,rgba(28,29,29,.2)_34%,rgba(28,29,29,.42)_62%,rgba(28,29,29,.92)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,29,29,.5)_0%,rgba(28,29,29,0)_60%)]" />
        </div>

        <div className="relative h-full">{copy}</div>

        <div ref={outro} className="pointer-events-none absolute inset-x-0 bottom-[16vh] px-4 text-center opacity-0" aria-hidden>
          <p className="font-serif text-[46px] italic leading-none text-ivory sm:text-[72px] lg:text-[104px]">{arrival}</p>
          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.34em] text-[#E3DACB]">{arrivalSub}</p>
        </div>

        <div ref={hint} className="pointer-events-none absolute bottom-6 right-6 hidden items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-ivory/80 lg:flex" aria-hidden>
          {scrollHint}
          <span className="np-scroll-line relative block h-12 w-px overflow-hidden bg-ivory/25" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-ivory/10" aria-hidden>
          <div ref={bar} className="h-full origin-left scale-x-0 bg-[#9CC3CC]" />
        </div>
      </div>
      {/* Screen readers get the arrival line once, as text. */}
      <p className="sr-only">
        {arrival} {arrivalSub}
      </p>
    </section>
  );
}
