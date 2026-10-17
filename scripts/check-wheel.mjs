// 051-G · 8: a real sideways wheel (trackpad) gesture over each photo strip must move it. Prints scrollLeft before → after.
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3911";
const b = await chromium.launch();
let fail = 0;
for (const w of [390, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  for (const [path, sel] of [
    ["/es/search?type=SALE", "[data-listing-card] [role=group]"],
    ["/es/listing/lomas-de-san-roman-6h-850m-eoaur5", "[data-testid=gallery-hero] > div"],
    ["/es/listing/lomas-de-san-roman-6h-850m-eoaur5", "[data-listing-card] [role=group]"],
  ]) {
    await p.goto(BASE + path, { waitUntil: "load" });
    await p.waitForTimeout(800);
    const el = p.locator(sel).first();
    if (!(await el.count())) { console.log(w, path, sel, "no existe"); continue; }
    await el.scrollIntoViewIfNeeded();
    await p.waitForTimeout(300);
    const box = await el.boundingBox();
    const before = await el.evaluate((e) => [e.scrollLeft, e.scrollWidth - e.clientWidth]);
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p.mouse.wheel(300, 0); // one big tick (the 051-G measurement)
    await p.waitForTimeout(900);
    const after = await el.evaluate((e) => e.scrollLeft);
    // A short trackpad-like gesture: 12 small sideways events, then the page must still scroll vertically.
    for (let i = 0; i < 12; i++) { await p.mouse.wheel(8, 1); await p.waitForTimeout(16); }
    await p.waitForTimeout(900);
    const after2 = await el.evaluate((e) => e.scrollLeft);
    // Vertical: the page (or the results column that holds the card) moves, unless it is already at its end.
    const ys = () => el.evaluate((e) => { let y = scrollY, room = document.documentElement.scrollHeight - innerHeight - scrollY; for (let n = e.parentElement; n; n = n.parentElement) { if (n.scrollHeight > n.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(n).overflowY)) { y += n.scrollTop; room += n.scrollHeight - n.clientHeight - n.scrollTop; } } return [y, room]; });
    const [y0, room] = await ys();
    await p.mouse.wheel(0, 400);
    await p.waitForTimeout(500);
    const [y1] = await ys();
    const ok = after > before[0] && after2 > after && (y1 > y0 || room < 2);
    if (!ok) fail++;
    console.log(`${ok ? "PASS" : "FAIL"} ${w} ${path} ${sel}: ${before[0]}→${after}→${after2} de ${before[1]} · vertical ${y0}→${y1}`);
  }
  await p.close();
}
await b.close();
process.exit(fail ? 1 : 0);
