/**
 * Site media in one place (043-C): swap these paths when the real drone photos and the D3-B clip arrive and every
 * band, the hero and /sell follow. Provisional sources: Drive «032-alta-resolucion» (illustrative, AI), 1280 px masters
 * in /public/media/032 (WebP + AVIF at 750 and 1280; next/image serves AVIF/WebP from the 1280 master).
 * `focus` is the object-position that keeps each photo's subject in frame at every crop.
 */
export type Photo = { src: string; width: number; height: number; focus: string; alt: { es: string; en: string } };

const p = (name: string, focus: string, es: string, en: string): Photo => ({
  src: `/media/032/032-${name}-1280.webp`,
  width: 1280,
  height: 720,
  focus,
  alt: { es, en },
});

export const PHOTOS = {
  /** «Entre el Ávila y el mar» band and the provisional hero loop. */
  torreAtardecer: p("torre-atardecer-2", "70% 50%", "Torre blanca frente al mar al atardecer, con la marina a sus pies", "White seafront tower at sunset, with the marina below"),
  /** Colección Privada band and /sell. */
  salonMar: p("interior-salon-mar", "50% 55%", "Salón luminoso con ventanales abiertos al mar", "Bright living room with windows open to the sea"),
  torreMarina: p("hero-torre-marina", "40% 50%", "Torre residencial sobre la marina de Lechería", "Residential tower over the Lechería marina"),
  costaAtardecer: p("hero-costa-atardecer", "50% 50%", "Costa con casas sobre el mar al atardecer", "Coastline with homes over the sea at sunset"),
} as const;

/** Hero: the poster is the LCP (16:9 desktop, 4:5 phone); the loop is mounted after load and only when motion and
 *  data allow it. Every file stays under 3 MB (scripts/check-media-size.mjs). */
export const HERO_MEDIA = {
  poster: { desktop: "/media/hero-poster.webp", mobile: "/media/hero-poster-mobile.webp", width: 1280, height: 720, mobileWidth: 720, mobileHeight: 900 },
  video: {
    desktop: { webm: "/media/hero-720.webm", mp4: "/media/hero-720.mp4" },
    mobile: { webm: "/media/hero-720x1280.webm", mp4: "/media/hero-720x1280.mp4" },
  },
} as const;
