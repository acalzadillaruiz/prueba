// 051-G · 10–11: own-text contrast walker (AA), including hover/active states axe never sees.
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3911";
const PAGES = (process.env.PAGES ?? "/es,/es/search?type=SALE,/es/search?type=COMMERCIAL,/es/listing/lomas-de-san-roman-6h-850m-eoaur5,/es/luxury,/es/sell").split(",");
const walk = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([\d.]+),? ([\d.]+),? ([\d.]+)(?:,? \/? ?([\d.]+))?/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
  const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (!r.width || !r.height || cs.visibility === "hidden" || +cs.opacity === 0 || el.closest(".sr-only,[aria-hidden=true],.leaflet-tile-pane")) continue;
    let fg = parse(cs.color); if (!fg) continue;
    // Effective background: blend translucent layers up the tree; stop (unknown) at an image/gradient.
    const layers = []; let img = false; let solid = false;
    for (let n = el; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage !== "none") { img = true; break; } if (n.tagName === "IMG" || n.tagName === "PICTURE") { img = true; break; } const b = parse(s.backgroundColor); const nr = n.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2; if (b && b[3] > 0 && cx >= nr.left && cx <= nr.right && cy >= nr.top && cy <= nr.bottom) { layers.push(b); if (b[3] >= 1) { solid = n !== document.body && n !== document.documentElement; break; } } }
    // Text laid over a photo or video that is not its ancestor (a transparent header over the hero): unknown ground too.
    if (!img && !solid) { const cx = r.x + r.width / 2, cy = r.y + r.height / 2; if (cy >= 0 && cy <= innerHeight && document.elementsFromPoint(cx, cy).some((n) => n.tagName === "IMG" || n.tagName === "VIDEO")) img = true; }
    if (img) continue;
    let bg = [255, 255, 255];
    for (const l of layers.reverse()) bg = bg.map((v, i) => l[i] * l[3] + v * (1 - l[3]));
    if (fg[3] < 1) fg = fg.map((v, i) => (i < 3 ? v * fg[3] + bg[i] * (1 - fg[3]) : 1));
    const a = lum(fg), b = lum(bg); const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    if (ratio < need) out.push(`${ratio.toFixed(2)}:1 «${el.textContent.trim().slice(0, 40)}» ${cs.color} sobre rgb(${bg.map(Math.round).join(",")}) ${size}px`);
  }
  return [...new Set(out)];
};
const b = await chromium.launch();
let total = 0;
for (const w of [390, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  for (const path of PAGES) {
    await p.goto(BASE + path, { waitUntil: "load" });
    await p.waitForTimeout(1200);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); await new Promise((r) => setTimeout(r, 800)); });
    const found = new Set(await p.evaluate(walk));
    // Hover / active states: the first cards, the first map pins (the pin of a hovered card turns mar profundo).
    for (const sel of ["[data-listing-card]", ".np-pin"]) {
      const els = await p.locator(sel).all();
      for (const el of els.slice(0, 3)) { if (!(await el.isVisible())) continue; await el.hover({ force: true, timeout: 2000 }).catch(() => {}); await p.waitForTimeout(250); for (const x of await p.evaluate(walk)) found.add(x); }
    }
    total += found.size;
    console.log(`${found.size ? "FAIL" : "PASS"} ${w} ${path}: ${found.size}`);
    for (const x of [...found].slice(0, 15)) console.log("   " + x);
  }
  await p.close();
}
await b.close();
process.exit(total ? 1 : 0);
