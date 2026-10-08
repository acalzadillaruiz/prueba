import { expect, test } from "@playwright/test";
import { demoLogin } from "./helpers";

// Phones: the open lead is a full-screen sheet with its own history entry (?lead=<id>), so Back returns to the list.
test.describe("Leads en el teléfono", () => {
  test.use({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });

  test("abrir un lead añade ?lead=, Atrás vuelve a la lista en el mismo punto; el enlace directo lo abre", async ({ page }) => {
    await demoLogin(page, /Dueño de agencia/);
    await page.goto("/es/agency/leads");
    const rows = page.locator("[data-lead-row]");
    await expect(rows.first()).toBeVisible();
    // A lead further down the list, so there is a scroll position to keep.
    const row = rows.nth(Math.min(4, (await rows.count()) - 1));
    await row.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const y = await page.evaluate(() => window.scrollY);
    expect(y).toBeGreaterThan(0);
    const id = await row.getAttribute("data-lead-row");

    await row.click();
    await expect(page).toHaveURL(new RegExp(`[?&]lead=${id}`));
    const back = page.getByRole("button", { name: /^Volver a Leads \(\d+\)$/ });
    await expect(back).toBeVisible();
    await expect(page.getByRole("dialog").getByText(/Interés · siguiente mejor acción/)).toBeVisible();

    // Browser / phone Back closes the sheet and stays in the inbox, at the same scroll.
    await page.goBack();
    await expect(page).toHaveURL(/\/es\/agency\/leads$/);
    await expect(back).toHaveCount(0);
    await expect(row).toBeInViewport();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 3);
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(y + 3);

    // The sticky bar closes it too.
    await row.click();
    await expect(page).toHaveURL(new RegExp(`[?&]lead=${id}`));
    await back.click();
    await expect(page).toHaveURL(/\/es\/agency\/leads$/);
    await expect(row).toBeInViewport();

    // Deep link: opens that lead straight away; the bar closes it without leaving the inbox.
    await page.goto(`/es/agency/leads?lead=${id}`);
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/es\/agency\/leads$/);
    await expect(rows.first()).toBeVisible();
  });
});

// Phones: the wide back-office tables (860–970 px) become one card per row; nothing may be clipped or cut mid-word.
test.describe("Tablas del panel como tarjetas en el teléfono", () => {
  test.use({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });

  const PAGES: [string, string[]][] = [
    ["/es/agency/capture", ["capture-cards"]],
    ["/es/agency/team", ["team-cards"]],
    ["/es/agency/reports", ["report-agent-cards", "report-zone-cards"]],
  ];

  test("Captación, Equipo e Informes: tarjetas en lugar de tablas y ningún contenido cortado a 390 px", async ({ page }) => {
    await demoLogin(page, /Dueño de agencia/);
    for (const [path, lists] of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      for (const id of lists) {
        await expect(page.getByTestId(id), `${path}: ${id}`).toBeVisible();
        await expect(page.getByTestId(id).locator("li").first(), `${path}: ${id}`).toBeVisible();
      }
      await expect(page.locator("main table:visible"), `${path}: no visible table`).toHaveCount(0);
      // Any element wider inside than its own box is cut (truncated text, a clipped column…). Intentional horizontal
      // scrollers (overflow-x auto/scroll, ScrollRegion) and visually hidden helpers (sr-only, ≤ 2 px) are exempt.
      const cut = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>("main *")) {
          if (el.closest("[data-scroll-region]") || el instanceof SVGElement || ["SELECT", "INPUT", "TEXTAREA", "OPTION"].includes(el.tagName)) continue;
          if (!el.offsetParent && getComputedStyle(el).position !== "fixed") continue;
          const cs = getComputedStyle(el);
          if (cs.overflowX === "auto" || cs.overflowX === "scroll") continue;
          if (el.clientWidth <= 2) continue;
          if (el.scrollWidth > el.clientWidth + 1) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} «${(el.textContent ?? "").trim().slice(0, 40)}» ${el.scrollWidth}>${el.clientWidth}`);
        }
        return out;
      });
      expect(cut, `${path}: cut elements`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path}: page width`).toBeLessThanOrEqual(390);
    }
  });
});
