// Records the immersive home in one continuous take (Playwright → webm → mp4), scrolling with the mouse wheel
// so the smooth scroll and the scroll scenes play exactly as a visitor sees them.
// Usage: BASE=http://localhost:3001 node scripts/video-home.mjs   → videos/new-place-portada.mp4
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3001";
const OUT = new URL("../videos/", import.meta.url).pathname;
const TMP = OUT + "tmp-portada/";
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const FFMPEG = process.env.FFMPEG ?? execFileSync("python3", ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();
const SIZE = { width: 1440, height: 900 };

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir: TMP, size: SIZE } });
// Demo bar out of shot: this is the visitor's view.
await ctx.addInitScript(() => {
  const s = document.createElement("style");
  s.textContent = "[data-demobar]{display:none!important}";
  document.documentElement.appendChild(s);
});
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);

/** Wheel-scrolls `px` over `ms` in small ticks (Lenis turns them into one smooth glide). */
async function glide(px, ms) {
  const ticks = Math.max(1, Math.round(ms / 50));
  for (let i = 0; i < ticks; i++) {
    await page.mouse.wheel(0, px / ticks);
    await wait(50);
  }
}
const vh = SIZE.height;

await page.goto(BASE + "/es", { waitUntil: "networkidle" });
await page.mouse.move(1100, 520);
await wait(4200); // entrance: title rises word by word
// Hero: through the arch, out to the sea.
await glide(vh * 0.9, 4200);
await wait(600);
await glide(vh * 0.9, 4200);
await wait(1800); // "Bienvenido a casa."
await glide(vh * 0.9, 3600);
// The building rises floor by floor, chapter by chapter.
for (let i = 0; i < 4; i++) {
  await glide(vh * 0.75, 3400);
  await wait(900);
}
await glide(vh * 0.4, 2000);
await wait(2600); // lit floors + labels
// Hover the penthouse label.
const label = page.locator('a[href*="/listing/"]').filter({ hasText: /USD/ }).first();
const box = await label.boundingBox().catch(() => null);
if (box) {
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 30 });
  await wait(1600);
  await page.mouse.move(1100, 520, { steps: 20 });
}
await glide(vh * 0.6, 2600);
// Colección Privada glides sideways.
await glide(vh * 2.4, 9000);
await wait(1000);
await glide(vh * 0.9, 3000);
// Map.
await glide(vh * 0.9, 3000);
await wait(1800);
// Remote purchase: the routes draw in to Lechería.
await glide(vh * 2.0, 8000);
await wait(1400);
// Owners.
await glide(vh * 1.0, 3500);
await wait(2400);
await page.close();
await ctx.close();
await browser.close();

const webm = readdirSync(TMP).find((f) => f.endsWith(".webm"));
const mp4 = OUT + "new-place-portada.mp4";
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", TMP + webm, "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
renameSync(TMP + webm, OUT + "tmp-portada.webm");
rmSync(TMP, { recursive: true, force: true });
rmSync(OUT + "tmp-portada.webm", { force: true });
console.log("saved", mp4);
