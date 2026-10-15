#!/usr/bin/env node
// audit:ui (043) — drives @playwright/cli over the public routes at 390×844 and 1440×900 and reports, per route and
// width: console errors, horizontal overflow and visible touch targets under 24 px (44 px is the goal, 24 the floor).
//
//   node scripts/audit-ui.mjs [--base http://localhost:3911] [--out .audit-ui] [--shots] [--only /es,/es/sell]
//
// Exit 1 when any route has a console error, an overflow or a target under 24 px.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const base = opt("base", process.env.E2E_BASE_URL || "http://localhost:3911");
const out = resolve(opt("out", ".audit-ui"));
const shots = args.includes("--shots");
const ROUTES = [
  "/es", "/es/search", "/es/listing/altamira-3h-142m-wi3sg7", "/es/listing/lomas-de-san-roman-6h-850m-eoaur5",
  "/es/listing/lecheria-2h-85m-fyhrjd", "/es/luxury", "/es/sell", "/es/saved", "/es/compare", "/es/alerts",
  "/es/login", "/es/register", "/es/forgot-password", "/en",
];
const only = opt("only", "");
const routes = only ? only.split(",") : ROUTES;
const WIDTHS = [[390, 844], [1440, 900]];

const S = "-s=audit-ui";
const cli = (...a) => execFileSync("npx", ["playwright-cli", S, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 90_000 });
const raw = (...a) => cli(...a, "--raw").trim();

const PROBE = `() => {
  const doc = document.documentElement;
  const overflow = Math.max(0, doc.scrollWidth - doc.clientWidth);
  const small = [];
  for (const el of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],summary')) {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || el.closest('[aria-hidden=true],[inert]')) continue;
    if (cs.clip !== 'auto' || cs.clipPath !== 'none') continue; // visually hidden until focused (skip link)
    if (cs.position !== 'fixed' && (r.bottom < 0 || r.top > innerHeight * 3)) continue;
    if (el.tagName === 'A' && cs.display === 'inline' && el.closest('p,li,dd')) continue; // inline text links are exempt (WCAG 2.5.8)
    if (r.width < 24 || r.height < 24) small.push((el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
  }
  return JSON.stringify({ overflow, small: small.slice(0, 12), smallCount: small.length });
}`;

mkdirSync(out, { recursive: true });
try { cli("close"); } catch {}
cli("open", "about:blank");
const report = [];
let bad = 0;
for (const [w, h] of WIDTHS) {
  cli("resize", String(w), String(h));
  for (const r of routes) {
    cli("console", "--clear");
    cli("goto", base + r);
    try { cli("eval", "() => new Promise((ok) => setTimeout(ok, 1200))"); } catch {}
    const m = JSON.parse(JSON.parse(raw("eval", PROBE)));
    const con = cli("console", "error");
    const errors = (con.match(/^\s*-?\s*\[ERROR\].*$/gim) || []).map((s) => s.trim()).filter((s) => !/favicon|ERR_ABORTED/i.test(s));
    if (shots) cli("screenshot", "--filename", join(out, `${w}${r.replace(/\//g, "_")}.png`));
    const row = { width: w, route: r, consoleErrors: errors.length, overflow: m.overflow, targetsUnder24: m.smallCount, examples: m.small, errors: errors.slice(0, 5) };
    if (row.consoleErrors || row.overflow || row.targetsUnder24) bad++;
    report.push(row);
    console.log(`${row.consoleErrors || row.overflow || row.targetsUnder24 ? "✗" : "✓"} ${w} ${r}  console=${row.consoleErrors} overflow=${row.overflow}px <24px=${row.targetsUnder24}${m.small.length ? "  " + m.small.slice(0, 3).join(" | ") : ""}`);
  }
}
cli("close");
writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
console.log(`\n${report.length - bad}/${report.length} clean · report: ${join(out, "report.json")}`);
process.exit(bad ? 1 : 0);
