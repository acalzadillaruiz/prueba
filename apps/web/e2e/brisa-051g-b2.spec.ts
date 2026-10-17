// 051-G block 2 regressions (Grok's phase-1 review of the 048, points 13–16): light search map, one dominant element
// on the desktop search, more pictures on /sell, 6–8 type sizes per page, and no Leaflet on the phone list view.
import { expect, test } from "@playwright/test";

const PAGES = ["/es", "/es/search?type=SALE", "/es/listing/lomas-de-san-roman-6h-850m-eoaur5", "/es/luxury", "/es/sell"];

/** Distinct rounded font sizes of the visible text (map pins and controls included), as the Taste probe counts them. */
async function sizes(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const out = new Set<number>();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || !n.textContent?.trim() || el.closest(".sr-only")) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (cs.display === "none" || cs.visibility === "hidden" || !r.width || !r.height) continue;
      out.add(Math.round(parseFloat(cs.fontSize)));
    }
    return [...out].sort((a, b) => a - b);
  });
}

for (const width of [390, 1440]) {
  test.describe(`051-G block 2 at ${width}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 900 } });

    test("15 · every public page uses 8 type sizes or fewer", async ({ page }) => {
      for (const path of PAGES) {
        await page.goto(path);
        const s = await sizes(page);
        expect(s.length, `${path}: ${s.join(", ")}`).toBeLessThanOrEqual(8);
      }
    });

    test("14 · /sell shows at least four photographs", async ({ page }) => {
      await page.goto("/es/sell");
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
      });
      expect(await page.locator("main img").count()).toBeGreaterThanOrEqual(4);
    });
  });
}

test.describe("051-G block 2 · desktop search", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("14 · the first screen has one dominant line (≥ 4.5vw)", async ({ page }) => {
    await page.goto("/es/search?type=SALE");
    const title = page.getByRole("heading", { name: "Casas en venta" });
    await expect(title).toBeVisible();
    const px = await title.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(px).toBeGreaterThanOrEqual(1440 * 0.045);
  });
});

test.describe("051-G block 2 · phone search", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("16 · the list view never loads Leaflet; the map view does", async ({ page }) => {
    const leaflet: string[] = [];
    page.on("request", (r) => { if (/arcgisonline|cartocdn|maptiler/.test(r.url())) leaflet.push(r.url()); });
    await page.goto("/es/search?type=SALE", { waitUntil: "load" });
    await page.waitForTimeout(3000);
    expect(await page.locator(".leaflet-container").count()).toBe(0);
    expect(leaflet).toHaveLength(0);
    await page.getByRole("button", { name: /^Mapa/ }).first().click();
    await expect(page.locator(".leaflet-container")).toHaveCount(1, { timeout: 15000 });
  });

  test("13 · the search map is as light as the home one (mean luminance ≥ 0.8)", async ({ page }) => {
    await page.goto("/es/search?type=SALE");
    await page.getByRole("button", { name: /^Mapa/ }).first().click();
    await page.waitForTimeout(4000);
    const shot = await page.locator(".np-brisa-map").first().screenshot();
    // Mean relative luminance of the PNG, decoded in the page (no image library needed in the test).
    const mean = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      let s = 0;
      for (let i = 0; i < d.length; i += 16) s += 0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2]);
      return s / (d.length / 16);
    }, shot.toString("base64"));
    expect(mean).toBeGreaterThanOrEqual(0.8);
  });
});
