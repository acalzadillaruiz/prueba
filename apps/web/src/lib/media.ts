/**
 * Site media in one place (043-C): swap these paths when the real drone photos and the D3-B clip arrive and every
 * band, the hero and /sell follow. Provisional sources: Drive «032-alta-resolucion» (illustrative, AI), 1280 px masters
 * in /public/media/032 (WebP + AVIF at 750 and 1280; next/image serves AVIF/WebP from the 1280 master).
 * `focus` is the object-position that keeps each photo's subject in frame at every crop.
 */
export type Photo = { src: string; width: number; height: number; focus: string; alt: { es: string; en: string } };

const q = (file: string, width: number, height: number, focus: string, es: string, en: string): Photo => ({ src: `/media/048/${file}`, width, height, focus, alt: { es, en } });

/**
 * 048 · real photographs (Unsplash Licence, free use; credits in public/media/048/CREDITOS.txt). No renders, and no
 * photo appears twice on a page. Keys keep their historical names so every band follows without code changes.
 */
export const PHOTOS = {
  /** «Pocas casas, bien elegidas» band. */
  torreAtardecer: q("villa-piscina-1800.webp", 1800, 1012, "50% 60%", "Casa moderna blanca con piscina bajo el cielo azul", "White modern house with a pool under a blue sky"),
  /** Colección privada band. */
  salonMar: q("salon-luz-1200.webp", 1200, 1500, "45% 50%", "Salón luminoso con grandes ventanales", "Bright living room with large windows"),
  /** «Compra sin sorpresas». */
  torreMarina: q("villa-terraza-1800.webp", 1800, 1012, "50% 50%", "Villa contemporánea con terrazas y piscina", "Contemporary villa with terraces and a pool"),
  /** «Vende tu casa» and /sell. */
  costaAtardecer: q("casa-patio-1800.webp", 1800, 1350, "45% 50%", "Patio con piscina junto a una casa blanca de líneas rectas", "Pool terrace beside a white, clean-lined house"),
} as const;

/** Hero: the poster is the LCP (16:9 desktop, 4:5 phone); the loop is mounted after load and only when motion and
 *  data allow it. Every file stays under 3 MB (scripts/check-media-size.mjs). */
export const HERO_MEDIA = {
  poster: { desktop: "/media/048/hero-playa-2400.webp", mobile: "/media/048/hero-playa-movil-1800.webp", width: 2400, height: 1350, mobileWidth: 1800, mobileHeight: 2250 },
  video: {
    desktop: { webm: "/media/hero-720.webm", mp4: "/media/hero-720.mp4" },
    mobile: { webm: "/media/hero-720x1280.webm", mp4: "/media/hero-720x1280.mp4" },
  },
} as const;
