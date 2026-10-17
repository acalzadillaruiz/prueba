// 048 · quick self-check at 390 and 1440: visible text under 12 px, warm/brown colours, repeated photos.
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3911";
const PAGES = ["/es", "/es/search?type=SALE", "/es/listing/lomas-de-san-roman-6h-850m-eoaur5"];
const b = await chromium.launch();
for (const w of [390, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  for (const path of PAGES) {
    await p.goto(BASE + path, { waitUntil: "load" });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } scrollTo(0, 0); });
    const r = await p.evaluate(() => {
      const small = new Set(), warm = new Set();
      const hsl = (c) => { const m = c.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/); if (!m || (m[4] !== undefined && +m[4] < .2)) return null; let [r, g, b] = [m[1], m[2], m[3]].map((x) => x / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return null; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; return { h, s, l }; };
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el); const rect = el.getBoundingClientRect();
        if (!rect.width || cs.visibility === "hidden" || cs.display === "none") continue;
        const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (own && parseFloat(cs.fontSize) < 12 && !el.closest(".leaflet-container,[aria-hidden=true],.sr-only")) small.add(`${parseFloat(cs.fontSize)}px «${el.textContent.trim().slice(0, 30)}»`);
        for (const prop of ["color", "backgroundColor"]) { if (prop === "color" && !own) continue; const x = hsl(cs[prop]); if (x && x.h > 15 && x.h < 50 && x.s > .15 && x.l < .6) warm.add(`${prop} ${cs[prop]} «${(el.textContent || el.className).toString().trim().slice(0, 25)}»`); }
      }
      const imgs = [...document.querySelectorAll("img")].filter((i) => i.getBoundingClientRect().width > 80).map((i) => (i.currentSrc || i.src).replace(/.*url=([^&]+).*/, (_, u) => decodeURIComponent(u)));
      const dup = imgs.filter((s, i) => imgs.indexOf(s) !== i);
      return { small: [...small].slice(0, 8), warm: [...warm].slice(0, 8), dup: [...new Set(dup)] };
    });
    console.log(`\n${w} ${path}\n  <12px: ${r.small.join(" | ") || "ninguno"}\n  marrón: ${r.warm.join(" | ") || "ninguno"}\n  fotos repetidas: ${r.dup.join(", ") || "ninguna"}`);
  }
  await p.close();
}
await b.close();
