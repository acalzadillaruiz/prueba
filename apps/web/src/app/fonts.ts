import localFont from "next/font/local";

/**
 * Self-hosted brand fonts via next/font, latin subset (covers Spanish and English, incl. ñ, ¿, ¡, « », €), with a
 * metric-matched fallback so text doesn't shift when the web font arrives (CLS).
 * Caracas Night (043, approved by Adolfo; DESIGN.md): Cormorant Garamond for display, h1, h2 and the large price
 * (≥ 24 px only), Jost for everything else. Both are variable fonts: one file each, the only two preloads.
 * Lexend Zetta stays for the "NEW PLACE" wordmark only and is not preloaded. All SIL OFL 1.1 (see ../fonts/*-OFL.txt).
 */
export const cormorant = localFont({
  src: [{ path: "../fonts/cormorant-garamond-latin-wght-normal.woff2", weight: "300 700", style: "normal" }],
  variable: "--font-cormorant",
  display: "swap",
  fallback: ["Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

export const jost = localFont({
  src: [{ path: "../fonts/jost-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-jost",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
  adjustFontFallback: "Arial",
});

export const zetta = localFont({
  src: [{ path: "../fonts/lexend-zetta-latin-200-normal.woff2", weight: "200" }],
  variable: "--font-zetta",
  display: "swap",
  preload: false,
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
  adjustFontFallback: "Arial",
});

export const fontVars = `${cormorant.variable} ${jost.variable} ${zetta.variable}`;
