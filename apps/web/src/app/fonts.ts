import localFont from "next/font/local";

/**
 * Self-hosted brand fonts via next/font, latin subset (covers Spanish and English, incl. ñ, ¿, ¡, « », €), with a
 * metric-matched fallback so text doesn't shift when the web font arrives (CLS).
 * Brisa (048, approved by Adolfo on 17/10; DESIGN.md): Jost for display and titles, Inter for text and interface.
 * Both are variable fonts: one file each, the only two preloads.
 * Lexend Zetta stays for the "NEW PLACE" wordmark only and is not preloaded. All SIL OFL 1.1 (see ../fonts/*-OFL.txt).
 */
export const inter = localFont({
  src: [{ path: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
  adjustFontFallback: "Arial",
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

export const fontVars = `${inter.variable} ${jost.variable} ${zetta.variable}`;
