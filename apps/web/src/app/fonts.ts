import localFont from "next/font/local";

/**
 * Self-hosted brand fonts via next/font: preloaded, latin subset only (covers Spanish and English, incl. € and ñ),
 * with a metric-matched fallback so text doesn't shift when the web font arrives (CLS).
 * Brand: Cormorant Garamond (titles, prices), Manrope (interface and text), Cinzel (the "NEW PLACE" wordmark only).
 */
export const cormorant = localFont({
  src: [
    { path: "../fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600" },
    { path: "../fonts/cormorant-garamond-latin-500-italic.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

export const manrope = localFont({
  src: [
    { path: "../fonts/manrope-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/manrope-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/manrope-latin-600-normal.woff2", weight: "600" },
    { path: "../fonts/manrope-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-manrope",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
  adjustFontFallback: "Arial",
});

export const cinzel = localFont({
  src: [{ path: "../fonts/cinzel-latin-500-normal.woff2", weight: "500" }],
  variable: "--font-cinzel",
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
  preload: false,
});

export const fontVars = `${cormorant.variable} ${manrope.variable} ${cinzel.variable}`;
