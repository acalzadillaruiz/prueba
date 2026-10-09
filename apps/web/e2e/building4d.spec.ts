import { expect, test } from "@playwright/test";

// Acceptance criteria of the living model (plan 017 S0-2, entries 021/022).
const model = '[data-building4d] [role="img"]';

test("la maqueta se mueve sola, sin tocar ni hacer scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/es");
  const box = page.locator(model);
  await box.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const a = await box.screenshot();
  await page.waitForTimeout(2000);
  const b = await box.screenshot();
  expect(Buffer.compare(a, b)).not.toBe(0);
});

test("arrastrar gira la maqueta y la pausa es accesible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/es");
  const box = page.locator(model);
  await box.scrollIntoViewIfNeeded();
  const pause = page.locator("[data-building4d]").getByRole("button", { name: "Pausar" });
  await pause.click();
  await expect(page.locator("[data-building4d]").getByRole("button", { name: "Reproducir" })).toHaveAttribute("aria-pressed", "true");
  const ry = () => page.locator("[data-building4d]").evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue("--ry")));
  const before = await ry();
  const r = (await box.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 + 100, r.y + r.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(Math.abs((await ry()) - before)).toBeGreaterThanOrEqual(15);
  // Pause button is at least 44×44.
  const pb = (await page.locator("[data-building4d]").getByRole("button", { name: "Reproducir" }).boundingBox())!;
  expect(pb.width).toBeGreaterThanOrEqual(44);
  expect(pb.height).toBeGreaterThanOrEqual(44);
});

test("la hora cambia la luz y la sección no secuestra el scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/es");
  const wrap = page.locator("[data-building4d]");
  await wrap.getByRole("button", { name: "Pausar" }).click();
  const slider = wrap.getByRole("slider");
  await slider.fill("7");
  const morning = await wrap.evaluate((el) => getComputedStyle(el).getPropertyValue("--shx"));
  await slider.fill("19");
  const evening = await wrap.evaluate((el) => getComputedStyle(el).getPropertyValue("--shx"));
  expect(morning).not.toBe(evening);
  expect(await wrap.evaluate((el) => getComputedStyle(el).getPropertyValue("--lights").trim())).toBe("1.000");
  const h = (await wrap.boundingBox())!.height;
  expect(h).toBeLessThanOrEqual(900);
  // No Three.js on the home page.
  const scripts = await page.evaluate(() => performance.getEntriesByType("resource").map((e) => e.name).join(" "));
  expect(scripts).not.toMatch(/three/i);
});

test.describe("movimiento reducido", () => {
  test("un fotograma fijo con botón Reproducir", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/es");
    const wrap = page.locator("[data-building4d]");
    await expect(wrap.getByRole("button", { name: "Reproducir" })).toBeVisible();
    await expect(wrap).toHaveAttribute("data-live", "0");
  });
});
