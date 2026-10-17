// 048 · capturas de revisión: 390 px (WebKit, DPR 3, como un iPhone) y 1440 px (Chromium), página entera.
// Uso: BASE=http://localhost:3911 OUT=/ruta/salida node scripts/shots-048.mjs [filtro]
import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3911";
const OUT = process.env.OUT ?? new URL("../captures/048/", import.meta.url).pathname;
const only = process.argv[2];
mkdirSync(OUT, { recursive: true });

const PAGES = [
  ["home", "/es"],
  ["search", "/es/search?type=SALE"],
  ["listing", "/es/listing/lomas-de-san-roman-6h-850m-eoaur5"],
  ["luxury", "/es/luxury"],
  ["sell", "/es/sell"],
  ["acceso", "/es/acceso"],
];

const VIEWS = [
  // WEBKIT=0: no WebKit in this machine → Chromium with the same iPhone metrics.
  { name: "390", engine: process.env.WEBKIT === "0" ? chromium : webkit, opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
  { name: "1440", engine: chromium, opts: { viewport: { width: 1440, height: 900 } } },
];

for (const v of VIEWS) {
  const browser = await v.engine.launch();
  const ctx = await browser.newContext({ ...v.opts, locale: "es-ES", reducedMotion: "reduce" });
  for (const [id, path] of PAGES) {
    if (only && !id.includes(only)) continue;
    const page = await ctx.newPage();
    await page.goto(BASE + path, { waitUntil: "load", timeout: 60000 });
    // Bring lazy blocks (map, photos) in, then back to the top for the first-screen shot.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}${id}-${v.name}-top.jpg`, quality: 80, type: "jpeg" });
    await page.screenshot({ path: `${OUT}${id}-${v.name}-full.jpg`, quality: 70, type: "jpeg", fullPage: true, scale: "css" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`${id} ${v.name} ok · overflow-x ${overflow}px`);
    await page.close();
  }
  await browser.close();
}
