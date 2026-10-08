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
