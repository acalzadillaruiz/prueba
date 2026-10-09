import localFont from "next/font/local";

/**
 * Self-hosted brand fonts via next/font ("Titanio 2035", entry 022 §2): Geist for everything (Light for titles and
 * prices, Regular for text, Medium for interface) and Geist Mono for labels, specs, times and data. Both are variable
 * (one file each, 100–900) under the SIL Open Font License 1.1 (../fonts/geist-OFL.txt) and cover Spanish in full
 * (á é í ó ú ñ ¿ ¡ €). A metric-matched Arial fallback keeps CLS ≈ 0 while the web font arrives.
 */
export const geist = localFont({
  src: [{ path: "../fonts/geist-variable.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-geist",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Arial"],
  adjustFontFallback: "Arial",
});

export const geistMono = localFont({
  src: [{ path: "../fonts/geist-mono-variable.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-geist-mono",
  display: "swap",
  fallback: ["ui-monospace", "Menlo", "monospace"],
  adjustFontFallback: false,
});

export const fontVars = `${geist.variable} ${geistMono.variable}`;
