import { expect, test } from "@playwright/test";
import { apiAs, demoLogin, logout, fillWizardBasics, fillWizardPrice } from "./helpers";

const LPG = "/es/listing/los-palos-grandes-3h-118m-l5u136";
const stamp = Date.now().toString(36);

test.describe.serial("Criterios de aceptación §15", () => {
  test("1 · /es muestra el mapa night centrado en Caracas con pines", async ({ page }) => {
    await page.goto("/es");
    await expect(page.getByRole("heading", { level: 1, name: /Hay casas que se visitan/ })).toBeVisible();
    // The map lives in the "#explorar" section (mounted when it nears the viewport).
    await page.locator("#explorar").scrollIntoViewIfNeeded();
    const map = page.locator('[role="application"]').first();
    await expect(map).toBeVisible();
    await expect(map.locator("g.cursor-pointer").first()).toBeVisible();
  });

  test("2 · filtro comprar · 2+ hab · < 250.000 USD · Chacao", async ({ page }) => {
    await page.goto("/es/search?type=SALE&zone=Chacao&beds=2&max=250000");
    // 19if9a left the public list (its photos were warped: plan 017 S0-4), so Chacao has 2 such homes.
    await expect(page.getByText(/^2 resultados/)).toBeVisible();
    const api = await apiAs(page, "GET", "listings?type=SALE&zone=Chacao&beds=2&max=250000");
    expect(api.json.total).toBe(2);
    for (const l of api.json.items) {
      expect(l.zone).toBe("Chacao");
      expect(l.beds).toBeGreaterThanOrEqual(2);
      expect(l.priceAmount).toBeLessThan(250000);
    }
  });

  test("3 · ficha bilingüe con Valor estimado New Place y pedir visita (lead creado)", async ({ page }) => {
    await page.goto(LPG);
    await expect(page.getByText("Valor estimado New Place").first()).toBeVisible();
    await expect(page.getByText("Comparables usados")).toBeVisible();
    await page.getByRole("button", { name: "EN", exact: true }).first().click();
    await expect(page.getByRole("heading", { level: 2, name: "Descripción" })).toBeVisible();
    await expect(page.locator('p[lang="en"]', { hasText: /Bright penthouse/ })).toBeVisible();
    // Name / email appear once a time is picked (progressive contact card).
    const slot = page.locator("button:not([disabled])", { hasText: /^\d\d:00$/ }).first();
    await slot.click();
    await page.getByLabel("Nombre").fill(`E2E Visitante ${stamp}`);
    await page.getByLabel("Email").fill(`e2e-${stamp}@example.com`);
    await page.getByRole("button", { name: /^Pedir visita · / }).click();
    await expect(page.getByTestId("lead-done")).toBeVisible();
  });

  test("4 · agente ve el lead con score y siguiente acción", async ({ page }) => {
    await demoLogin(page, /Agente/);
    await page.goto("/es/agency/leads");
    const row = page.getByRole("button", { name: new RegExp(`E2E Visitante ${stamp}`) });
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByText(/Interés · siguiente mejor acción/)).toBeVisible();
    await expect(page.getByTestId("next-action")).toHaveAttribute("data-action", "PROPOSE_TOUR");
  });

  test("5 · propietario publica FSBO en Altamira", async ({ page }) => {
    await demoLogin(page, /Propietario particular/);
    await page.goto("/es/owner/new");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /Publicar yo mismo/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("textbox", { name: "Dirección" }).fill(`Av. San Juan Bosco, Res. E2E ${stamp}, Altamira`);
    await page.getByRole("option").filter({ hasText: "Altamira" }).first().click();
    await expect(page.getByText(/Sin duplicados/)).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await fillWizardBasics(page);
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByTestId("photo-input").setInputFiles("e2e/fixtures/photo.jpg");
    await page.getByRole("button", { name: "Continuar" }).click();
    await fillWizardPrice(page);
    await page.getByRole("button", { name: /Redactar con IA/ }).click();
    await expect(page.getByLabel("Título")).not.toHaveValue("");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("checkbox", { name: /Confirmo/ }).check();
    await page.getByRole("button", { name: "Publicar ahora" }).click();
    await expect(page.getByTestId("owner-published")).toBeVisible({ timeout: 30_000 });
    const res = await apiAs(page, "GET", "listings?type=SALE&zone=Altamira");
    expect(res.json.items.some((l: { address: string; photos: string[] }) => l.address.includes(`E2E ${stamp}`) && l.photos.length === 1)).toBeTruthy();
  });

  test("6 · dueño de agencia ve el dashboard con datos", async ({ page }) => {
    await demoLogin(page, /Dueño de agencia/);
    await page.goto("/es/agency");
    await expect(page.locator("main").getByText("Inmuebles activos").first()).toBeVisible();
    await expect(page.getByText("Ranking de agentes").first()).toBeVisible();
    await expect(page.getByText("Valentina Rojas").first()).toBeVisible();
  });

  test("7 · superadmin apaga un inmueble y desaparece de la búsqueda", async ({ page }) => {
    await demoLogin(page, /Superadmin/);
    const before = await apiAs(page, "GET", "listings?type=SALE&zone=Chacao&beds=2&max=250000");
    const id: string = before.json.items[0]?.id;
    expect(id).toBeTruthy();
    await page.goto("/es/platform/moderation");
    await page.locator(`[data-listing="${id}"]`).getByRole("button", { name: /Apagar/ }).click();
    await page.locator(`[data-listing="${id}"]`).getByLabel("Motivo de la retirada").fill("Prueba E2E: fotos duplicadas");
    await page.locator(`[data-listing="${id}"]`).getByRole("button", { name: /Confirmar retirada/ }).click();
    await expect(page.locator(`[data-listing="${id}"]`).getByRole("button", { name: /Restaurar/ })).toBeVisible();
    const after = await apiAs(page, "GET", "listings?type=SALE&zone=Chacao&beds=2&max=250000");
    expect(after.json.items.map((l: { id: string }) => l.id)).not.toContain(id);
    // restore for idempotent runs
    await page.locator(`[data-listing="${id}"]`).getByRole("button", { name: /Restaurar/ }).click();
    await expect(page.locator(`[data-listing="${id}"]`).getByRole("button", { name: /Apagar/ })).toBeVisible();
  });

  test("8 · PWA instalable: manifest válido e iconos", async ({ request }) => {
    const r = await request.get("/manifest.webmanifest");
    expect(r.ok()).toBeTruthy();
    const m = await r.json();
    expect(m.name).toBe("New Place");
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe("#F1EBE3"); // Cal (light-first)
    expect(m.id).toBe("/");
    // start_url lets the middleware pick the visitor's language (/es or /en)
    const start = await request.get(m.start_url);
    expect(start.ok()).toBeTruthy();
    expect(new URL(start.url()).pathname).toMatch(/^\/(es|en)$/);
    for (const icon of m.icons) expect((await request.get(icon.src)).ok()).toBeTruthy();
  });

  test("9 · /en no rompe rutas", async ({ page }) => {
    for (const p of ["/en", "/en/search?type=LONG_RENT", "/en/luxury", "/en/login", LPG.replace("/es/", "/en/")]) {
      const r = await page.goto(p);
      expect(r?.status(), p).toBe(200);
    }
    await expect(page.getByText("Comparables used")).toBeVisible();
  });

  test("10 · sin Maps key ni AI key: sin crash (mapa ilustrado + IA local)", async ({ page }) => {
    await page.goto("/es/search?type=SALE");
    await expect(page.getByText(/Mapa ilustrativo/).first()).toBeVisible();
    const r = await apiAs(page, "POST", "ai/search-parse", { q: "ático con luz en Los Palos Grandes por menos de 180 mil" });
    expect(r.json.provider).toBe("heuristic");
    expect(r.json.query.maxPrice).toBe(180000);
    await logout(page);
  });
});
