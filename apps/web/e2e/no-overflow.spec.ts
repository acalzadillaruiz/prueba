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

// Calendario and Equipo beside the sidebar at 1024 and 1280: Equipo's table fits (no sideways scroll, nothing under the
// edge); the calendar week fits too, and if it ever has to scroll the hour column stays pinned in view (sticky left).
for (const width of [1024, 1280]) {
  test(`panel de agencia a ${width}px: Calendario y Equipo sin columnas cortadas`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await demoLogin(page, /Dueño de agencia/);
    for (const path of ["/es/agency/calendar", "/es/agency/team"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} @ ${width}: page width`).toBeLessThanOrEqual(width);
      const regions = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("main [data-scroll-region]")]
          .filter((r) => r.offsetParent !== null)
          .map((r) => {
            const el = r.querySelector<HTMLElement>("[role=region]")!;
            const hour = el.querySelector<HTMLElement>(".sticky.left-0");
            const box = el.getBoundingClientRect();
            const hb = hour?.getBoundingClientRect();
            return { label: el.getAttribute("aria-label"), sw: el.scrollWidth, cw: el.clientWidth, hourInView: hb ? hb.left >= box.left - 1 && hb.right <= box.right + 1 : null };
          }),
      );
      expect(regions.length, `${path}: regions`).toBeGreaterThan(0);
      for (const r of regions) {
        if (r.label === "Semana") expect(r.hourInView, `${path} · hour column visible`).toBe(true);
        else expect(r.sw, `${path} · ${r.label}: ${r.sw} > ${r.cw}`).toBeLessThanOrEqual(r.cw + 1);
      }
      if (path.endsWith("/calendar")) {
        // Title, arrows and legend sit outside the scroller: the whole legend is on screen.
        await expect(page.getByText("Slot libre", { exact: true })).toBeInViewport({ ratio: 1 });
      }
    }
  });
}

// Laptop heights: every sidebar section (down to «Ajustes») shows without the nav scrolling; the secondary actions
// (public site, theme, sign out) live in the account menu at the foot of the sidebar.
for (const [width, height] of [
  [1024, 768],
  [1280, 720],
]) {
  test(`barra lateral a ${width}×${height}: «Ajustes» visible sin scroll interno y menú de cuenta`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await demoLogin(page, /Dueño de agencia/);
    await page.goto("/es/agency");
    const nav = page.getByRole("navigation", { name: "Panel de agencia" });
    await expect(nav.getByRole("link", { name: "Ajustes" })).toBeInViewport({ ratio: 1 });
    expect(await nav.evaluate((el) => el.scrollHeight - el.clientHeight), "nav inner scroll").toBeLessThanOrEqual(1);
    const account = page.getByRole("button", { name: /opciones de cuenta/ });
    await expect(account).toHaveAttribute("aria-expanded", "false");
    await account.click();
    const menu = page.locator("#np-account-menu");
    await expect(menu.getByRole("link", { name: "Ver sitio público" })).toBeVisible();
    for (const name of ["Modo oscuro", "Cerrar sesión"]) await expect(menu.getByRole("button", { name }), name).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(account).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toHaveCount(0);
  });
}
