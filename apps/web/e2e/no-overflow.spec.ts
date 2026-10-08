import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

// No page may be wider than the screen: a sideways scroll hides the menu, the tab bar and buttons.
const PAGES = ["/es", "/en", "/es/search?type=SALE", "/es/sell", "/es/luxury"];
const WIDTHS = [360, 390, 768, 1024, 1280, 1366];

for (const width of WIDTHS) {
  test(`nada más ancho que la pantalla a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const listing = await page.request.get("/api/v1/listings?type=SALE");
    const slug = ((await listing.json()).items as { slug: string }[])[0].slug;
    for (const path of [...PAGES, `/es/listing/${slug}`]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(sw, `${path} @ ${width}px`).toBeLessThanOrEqual(width);
    }
  });
}

// Signed-in back-office pages (sidebar from lg, bottom bar + slim demo tab below it): same rule.
const AGENCY_PAGES = ["/es/agency", "/es/agency/listings", "/es/agency/leads", "/es/agency/calendar", "/es/agency/reports"];

for (const width of [390, 1024]) {
  test(`panel de agencia: nada más ancho que la pantalla a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await demoLogin(page, /Dueño de agencia/);
    for (const path of AGENCY_PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(sw, `${path} @ ${width}px`).toBeLessThanOrEqual(width);
    }
  });
}

// Desktop 1280 (sidebar + 936 px of content): the capture queue and the listings table fit without a sideways scroll, so
// no column hides under the actions column (which only pins while its table really overflows: [data-overflow]).
test("panel de agencia a 1280px: Captación e Inmuebles sin scroll horizontal en sus tablas", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await demoLogin(page, /Dueño de agencia/);
  for (const path of ["/es/agency/capture", "/es/agency/listings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main table:visible").first(), `${path}: table`).toBeVisible();
    const regions = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("main [data-scroll-region]")]
        .filter((r) => r.offsetParent !== null)
        .map((r) => {
          const el = r.querySelector<HTMLElement>("[role=region]")!;
          return { label: el.getAttribute("aria-label"), sw: el.scrollWidth, cw: el.clientWidth, pinned: r.hasAttribute("data-overflow") };
        }),
    );
    expect(regions.length, `${path}: table regions`).toBeGreaterThan(0);
    for (const r of regions) {
      expect(r.sw, `${path} · ${r.label}: ${r.sw} > ${r.cw}`).toBeLessThanOrEqual(r.cw + 1);
      expect(r.pinned, `${path} · ${r.label}: data-overflow`).toBe(false);
    }
  }
});
