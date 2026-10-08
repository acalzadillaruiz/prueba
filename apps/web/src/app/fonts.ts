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

export const fontVars = `${prata.variable} ${jost.variable} ${cinzel.variable}`;
