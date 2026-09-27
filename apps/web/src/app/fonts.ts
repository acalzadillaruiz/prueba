import localFont from "next/font/local";

/**
 * Self-hosted brand fonts via next/font: preloaded, latin subset only (covers Spanish and English, incl. € and ñ),
 * with a metric-matched fallback so text doesn't shift when the web font arrives (CLS).
 */
export const outfit = localFont({
  src: [
    { path: "../fonts/outfit-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/outfit-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/outfit-latin-600-normal.woff2", weight: "600" },
    { path: "../fonts/outfit-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-outfit",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
  adjustFontFallback: "Arial",
});

export const sourceSans = localFont({
  src: [
    { path: "../fonts/source-sans-3-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/source-sans-3-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-source-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
  adjustFontFallback: "Arial",
});

export const fontVars = `${outfit.variable} ${sourceSans.variable}`;
