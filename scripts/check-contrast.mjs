// 051-G · 9–11: axe-core colour contrast (AA) and prohibited ARIA on the public pages at 390 and 1440.
import { chromium } from "playwright";
import { createRequire } from "node:module";
const axeSrc = (await import("node:fs")).readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const BASE = process.env.BASE ?? "http://localhost:3911";
const PAGES = (process.env.PAGES ?? "/es,/es/search?type=SALE,/es/listing/lomas-de-san-roman-6h-850m-eoaur5,/es/luxury,/es/sell").split(",");
const b = await chromium.launch();
let total = 0;
for (const w of [390, 1440]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, reducedMotion: "reduce" });
  for (const path of PAGES) {
    await p.goto(BASE + path, { waitUntil: "load" });
    await p.waitForTimeout(1200);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); });
    await p.waitForTimeout(400);
    await p.addScriptTag({ content: axeSrc });
    const [v, inc] = await p.evaluate(async () => { const r = await window.axe.run(document, { runOnly: ["color-contrast", "aria-prohibited-attr", "aria-allowed-attr"] }); const m = (x) => ({ id: x.id, nodes: x.nodes.map((n) => `${n.target.join(" ")} · ${(n.any[0]?.message ?? n.failureSummary ?? "").slice(0, 140)}`) }); return [r.violations.map(m), r.incomplete.map(m)]; });
    const n = v.reduce((s, x) => s + x.nodes.length, 0);
    total += n;
    console.log(`${n ? "FAIL" : "PASS"} ${w} ${path}: ${n}`);
    for (const x of v) for (const node of x.nodes.slice(0, 12)) console.log(`   ${x.id}: ${node}`);
    // Text axe cannot decide (over a photo or a gradient): listed for a human look, never counted as a pass.
    if (process.env.INCOMPLETE) for (const x of inc) for (const node of x.nodes) console.log(`   ? ${x.id}: ${node}`);
  }
  await p.close();
}
await b.close();
process.exit(total ? 1 : 0);
