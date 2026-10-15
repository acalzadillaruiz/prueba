"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { HERO_MEDIA } from "@/lib/media";

const PAUSE_KEY = "np-hero-video";

type Conn = { saveData?: boolean; effectiveType?: string };

/** No video when the visitor asks for less motion or less data (Save-Data header via middleware cookie, the
 *  connection's saveData flag, or a slow link): the poster alone stays. */
function videoAllowed() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (document.cookie.split("; ").includes("np-save-data=1")) return false;
  const c = (navigator as Navigator & { connection?: Conn }).connection;
  if (c?.saveData) return false;
  if (c?.effectiveType && ["slow-2g", "2g", "3g"].includes(c.effectiveType)) return false;
  return true;
}

/**
 * Hero loop (043-C): a silent, decorative clip laid over the poster (the poster image is the LCP and stays painted
 * underneath). It is mounted only after the page has loaded plus a second, in an idle slot, then fades in over 600 ms.
 * A 44 px pause/play button (the motion lasts more than 5 s) remembers the choice in localStorage.
 */
export function HeroVideo({ locale }: { locale: Locale }) {
  const [src, setSrc] = useState<{ webm: string; mp4: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoAllowed()) return;
    let idle = 0;
    let timer = 0;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const mount = () => {
      const wide = window.matchMedia("(min-width: 640px)").matches;
      setSrc(wide ? HERO_MEDIA.video.desktop : HERO_MEDIA.video.mobile);
      try {
        setPaused(localStorage.getItem(PAUSE_KEY) === "paused");
      } catch {}
    };
    const later = () => {
      timer = window.setTimeout(() => {
        if (w.requestIdleCallback) idle = w.requestIdleCallback(mount, { timeout: 2000 });
        else mount();
      }, 1000);
    };
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    return () => {
      window.removeEventListener("load", later);
      window.clearTimeout(timer);
      if (idle) w.cancelIdleCallback?.(idle);
    };
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (paused) v.pause();
    else void v.play().catch(() => {});
  }, [paused, src]);

  if (!src) return null;
  const toggle = () => {
    const next = !paused;
    setPaused(next);
    try {
      localStorage.setItem(PAUSE_KEY, next ? "paused" : "playing");
    } catch {}
  };
  return (
    <>
      <video
        ref={video}
        aria-hidden="true"
        autoPlay={!paused}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        onPlaying={() => setReady(true)}
        className={cn("np-hero-video absolute inset-0 -z-20 h-full w-full object-cover transition-opacity duration-[600ms] ease-np", ready ? "opacity-100" : "opacity-0")}
      >
        <source src={src.webm} type="video/webm" />
        <source src={src.mp4} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={paused}
        aria-label={paused ? tx(locale, "Reproducir el vídeo de fondo", "Play the background video") : tx(locale, "Pausar el vídeo de fondo", "Pause the background video")}
        className="absolute bottom-[calc(env(safe-area-inset-bottom)+16px)] right-[clamp(16px,4vw,40px)] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[rgb(14_26_43/.55)] text-ivory transition-colors duration-np ease-np hover:bg-[rgb(14_26_43/.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory max-sm:bottom-auto max-sm:top-[calc(env(safe-area-inset-top)+76px)]"
      >
        {paused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
      </button>
    </>
  );
}
