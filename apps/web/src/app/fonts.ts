import localFont from "next/font/local";

/**
 * Self-hosted brand fonts via next/font: preloaded, latin subset only (covers Spanish and English, incl. € and ñ),
 * with a metric-matched fallback so text doesn't shift when the web font arrives (CLS).
 * Brand (030 · estilo AMALI, approved by Adolfo): Lexend Zetta (titles and the "NEW PLACE" wordmark: wide, thin,
 * in capitals) and Barlow (text Light 300, interface Regular/Medium, prices Light with tabular figures).
 * Both SIL OFL 1.1 (see ../fonts/*-OFL.txt).
 */
export const zetta = localFont({
  src: [
    { path: "../fonts/lexend-zetta-latin-200-normal.woff2", weight: "200" },
    { path: "../fonts/lexend-zetta-latin-300-normal.woff2", weight: "300" },
  ],
  variable: "--font-zetta",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
  adjustFontFallback: "Arial",
});

export const barlow = localFont({
  src: [
    { path: "../fonts/barlow-latin-300-normal.woff2", weight: "300" },
    { path: "../fonts/barlow-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/barlow-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/barlow-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-barlow",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
  adjustFontFallback: "Arial",
});

export const fontVars = `${zetta.variable} ${barlow.variable}`;
