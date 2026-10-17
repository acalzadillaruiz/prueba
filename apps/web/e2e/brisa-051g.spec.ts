// 051-G regressions (Grok's phase-1 review of the 048): sideways trackpad gestures and AA contrast that had failed.
import { expect, test } from "@playwright/test";

const LISTING = "/es/listing/lomas-de-san-roman-6h-850m-eoaur5";

const lum = (rgb: number[]) => {
  const f = (x: number) => ((x /= 255) <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
};
const ratio = (a: number[], b: number[]) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);

async function sideways(page: import("@playwright/test").Page, selector: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const box = (await el.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 12; i++) await page.mouse.wheel(8, 1); // a short trackpad swipe, far below half a slide
  await page.waitForTimeout(900);
  return el.evaluate((e) => e.scrollLeft);
}

for (const width of [390, 1440]) {
  test.describe(`051-G at ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("8 · a sideways gesture moves the search card photos and the listing gallery", async ({ page }) => {
      await page.goto("/es/search?type=SALE");
      expect(await sideways(page, "[data-listing-card] [role=group]")).toBeGreaterThan(0);
      await page.goto(LISTING);
      expect(await sideways(page, "[data-testid=gallery-hero] > div")).toBeGreaterThan(0);
    });

    test("9 · footer language and theme switches are AA on the footer bar", async ({ page }) => {
      await page.goto("/es");
      for (const name of [/English/, /Modo oscuro/]) {
        const el = page.locator("footer").getByRole(/English/.test(String(name)) ? "link" : "button", { name }).first();
        const [fg, bg] = await el.evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e.closest("footer > div.relative")!).backgroundColor]);
        expect(ratio(rgb(fg), rgb(bg))).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
}

test("10 · the listing valuation panel has no text under AA on mar profundo", async ({ page }) => {
  await page.goto(LISTING);
  const low = await page.locator(".np-navy-panel").first().evaluate((panel) => {
    const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const bg = parse(getComputedStyle(panel).backgroundColor);
    const out: string[] = [];
    for (const el of panel.querySelectorAll("*")) {
      if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim())) continue;
      const [r, g, b, a = 1] = parse(getComputedStyle(el).color);
      out.push(JSON.stringify([[r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)], bg, el.textContent!.trim().slice(0, 30)]));
    }
    return out;
  });
  for (const row of low) {
    const [fg, bg, text] = JSON.parse(row);
    expect(ratio(fg, bg), text).toBeGreaterThanOrEqual(4.5);
  }
});
