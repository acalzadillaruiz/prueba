import localFont from "next/font/local";

/**
 * Self-hosted brand fonts via next/font: preloaded, latin subset only (covers Spanish and English, incl. € and ñ),
 * with a metric-matched fallback so text doesn't shift when the web font arrives (CLS).
 * Brand (Palette A · Arcilla y Obsidiana): Prata (titles and prices, 32px and up), Jost (interface and text),
 * Cinzel (the "NEW PLACE" wordmark only). Prata ships one weight; 500/600/italic map to the same file so the
 * browser never synthesises bold or slanted glyphs.
 */
export const prata = localFont({
  src: [
    { path: "../fonts/prata-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/prata-latin-400-normal.woff2", weight: "500" },
    { path: "../fonts/prata-latin-400-normal.woff2", weight: "600" },
    { path: "../fonts/prata-latin-400-normal.woff2", weight: "500", style: "italic" },
  ],
  variable: "--font-prata",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

/**
 * "NP Digits": Prata's "1" has no flag and reads as a lowercase "l" ("USD ll8.000", "l resultado"), which hurts trust
 * in prices. This face carries only the digits 0–9 (unicode-range) from Gilda Display, a high-contrast display serif
 * with a flagged 1 and lining figures (SIL OFL 1.1, see ../fonts/gilda-display-OFL.txt). It is listed FIRST in
 * --font-serif (globals.css), so every serif number in the app — prices, counts, years — picks it up automatically,
 * while letters, punctuation and separators still come from Prata. size-adjust scales Gilda's digits up to Prata's
 * figure height (65 → 83 units per 100px); the ascent/descent overrides keep it from growing line boxes.
 * Mapped to 400/500/600 like Prata so the browser never synthesises bold digits next to Prata's single weight.
 */
export const npDigits = localFont({
  src: [
    { path: "../fonts/gilda-display-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/gilda-display-latin-400-normal.woff2", weight: "500" },
    { path: "../fonts/gilda-display-latin-400-normal.woff2", weight: "600" },
  ],
  variable: "--font-np-digits",
  display: "swap",
  fallback: [],
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0030-0039" },
    { prop: "size-adjust", value: "127%" },
    { prop: "ascent-override", value: "72%" },
    { prop: "descent-override", value: "18%" },
    { prop: "line-gap-override", value: "0%" },
  ],
});

export const jost = localFont({
  src: [
    { path: "../fonts/jost-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/jost-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/jost-latin-600-normal.woff2", weight: "600" },
    { path: "../fonts/jost-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-jost",
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

export const fontVars = `${prata.variable} ${npDigits.variable} ${jost.variable} ${cinzel.variable}`;
