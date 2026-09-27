// Lighthouse audit (mobile) of the key public pages with minimum scores.
// Usage: BASE=http://localhost:3001 node scripts/lighthouse.mjs   (CHROME_PATH optional)
// Thresholds (0–100) via LH_MIN_PERF / LH_MIN_A11Y / LH_MIN_BP / LH_MIN_SEO. Exit 1 if any page is below.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3001";
const OUT = new URL("../.lighthouse/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const MIN = { performance: +(process.env.LH_MIN_PERF ?? 85), accessibility: +(process.env.LH_MIN_A11Y ?? 95), "best-practices": +(process.env.LH_MIN_BP ?? 95), seo: +(process.env.LH_MIN_SEO ?? 95) };
const PAGES = ["/es", "/es/search?type=SALE", "/es/listing/los-palos-grandes-3h-118m-l5u136", "/es/luxury"];
const bin = new URL("../node_modules/.bin/lighthouse", import.meta.url).pathname;

let failed = false;
const rows = [];
for (const path of PAGES) {
  const file = `${OUT}${path.replace(/[^a-z0-9]+/gi, "_") || "home"}.json`;
  let best = null;
  for (let run = 0; run < 2; run++) {
    execFileSync(bin, [BASE + path, "--quiet", "--chrome-flags=--headless=new --no-sandbox", "--only-categories=performance,accessibility,best-practices,seo", "--output=json", `--output-path=${file}`], { stdio: "inherit", env: process.env });
    const cats = JSON.parse(readFileSync(file, "utf8")).categories;
    const s = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, Math.round(v.score * 100)]));
    if (!best || s.performance > best.performance) best = s;
  }
  rows.push({ path, ...best });
  for (const [k, min] of Object.entries(MIN)) if (best[k] < min) failed = true;
}
console.table(rows);
if (failed) {
  console.error(`Below thresholds ${JSON.stringify(MIN)}`);
  process.exit(1);
}
