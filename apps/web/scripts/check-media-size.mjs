#!/usr/bin/env node
// 043-C: every video in public/media must stay under 3 MB and every poster under 150 KB. Exit 1 otherwise (CI).
import { readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const dir = new URL("../public/media/", import.meta.url).pathname;
const MB = 1024 * 1024;
let bad = 0;
for (const f of readdirSync(dir)) {
  const path = join(dir, f);
  if (statSync(path).isDirectory()) continue;
  const size = statSync(path).size;
  const video = [".mp4", ".webm"].includes(extname(f));
  const poster = /poster/.test(f);
  const limit = video ? 3 * MB : poster ? 150 * 1024 : Infinity;
  const ok = size < limit;
  if (!ok) bad++;
  if (video || poster) console.log(`${ok ? "✓" : "✗"} ${f}  ${(size / 1024).toFixed(0)} KB  (limit ${(limit / 1024).toFixed(0)} KB)`);
}
process.exit(bad ? 1 : 0);
