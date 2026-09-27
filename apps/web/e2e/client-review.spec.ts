import { expect, test, type Page } from "@playwright/test";
import { apiAs, demoLogin, expectOk, logout } from "./helpers";

// Regression tests for the client-flow review (search NL, owner wizard, owner inbox, account, auth).
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Fills an input after hydration (a fill before React attaches is reset on hydrate). */
async function fillHydrated(page: Page, name: string | RegExp, value: string) {
  const input = page.getByRole("textbox", { name });
  await expect(async () => {
    await input.fill(value);
    await expect(input).toHaveValue(value, { timeout: 1000 });
  }).toPass();
  return input;
}

test.describe.serial("Cliente · regresiones de la revisión", () => {
  test("búsqueda NL: «2+ hab», rango «entre … y … mil», ciudad y sin falso «mascotas» por Petare", async ({ page }) => {
    await page.goto("/es/search");
    const nl = await fillHydrated(page, "Búsqueda en lenguaje natural", "casa 2+ hab en Caracas entre 100 y 400 mil cerca de Petare");
    await nl.press("Enter");
    await page.waitForURL(/beds=2/);
    const url = new URL(page.url());
    expect(url.searchParams.get("beds")).toBe("2");
    expect(url.searchParams.get("min")).toBe("100000");
    expect(url.searchParams.get("max")).toBe("400000");
    expect(url.searchParams.get("zone")).toBe("Caracas");
    expect(url.searchParams.get("pets")).toBeNull();
    // Chips in Spanish (the kind used to show the raw English key "house").
    await expect(page.getByRole("button", { name: "Quitar filtro: Casa" })).toBeVisible();
    // A city from the parser is still shown as the selected zone.
    await expect(page.getByRole("combobox", { name: "Zona", exact: true })).toHaveValue("Caracas");
  });

  test("búsqueda NL: el área («más de 100 m²») no se toma como precio", async ({ page }) => {
    await page.goto("/en/search");
    const nl = await fillHydrated(page, "Natural-language search", "apartment over 100 m2 in Altamira");
    await nl.press("Enter");
    await page.waitForURL(/zone=Altamira/);
    const url = new URL(page.url());
    expect(url.searchParams.get("min")).toBeNull();
    expect(url.searchParams.get("max")).toBeNull();
    await expect(page.getByRole("button", { name: "Remove filter: Apartment" })).toBeVisible();
  });

  test("asistente: terreno sin habitaciones, año inválido bloquea con mensaje y la IA no escribe «hab.»", async ({ page }) => {
    await demoLogin(page, /Propietario particular/);
    await page.goto("/es/owner/new");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /Publicar yo mismo/ }).click();
    await page.getByRole("button", { name: "Terreno" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("textbox", { name: "Dirección" }).fill(`Calle E2E ${stamp}, El Hatillo`);
    await page.getByRole("option").filter({ hasText: "El Hatillo" }).first().click();
    await page.getByRole("button", { name: "Continuar" }).click();
    // Land: no bedrooms/bathrooms/parking steppers.
    await expect(page.getByRole("button", { name: "Habitaciones +" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Baños +" })).toHaveCount(0);
    await page.getByLabel("Año de construcción").fill("20");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText(/Año entre 1800 y/)).toBeVisible();
    await expect(page.getByText("Paso 3 de 6")).toBeVisible();
    await page.getByLabel("Año de construcción").fill("2001");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Paso 4 de 6")).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    // Price accepts being cleared while typing; an empty price blocks with a message.
    const price = page.getByLabel("Tu precio (USD)");
    await price.fill("");
    await expect(page.getByText("Escribe un precio en USD mayor que 0, sin decimales.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await price.fill("95000");
    await page.getByRole("button", { name: /Redactar con IA/ }).click();
    await expect(page.getByLabel("Título")).toHaveValue(/Terreno/);
    await expect(page.getByLabel("Título")).not.toHaveValue(/hab\./);
    await page.evaluate(() => sessionStorage.clear());
  });

  test("asistente: alquiler muestra «/ mes» y un inmueble de lujo puede ser privado", async ({ page }) => {
    await demoLogin(page, /Propietario particular/);
    await page.goto("/es/owner/new");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "Alquiler", exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("textbox", { name: "Dirección" }).fill(`Av. E2E ${stamp}, Altamira`);
    await page.getByRole("option").filter({ hasText: "Altamira" }).first().click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("checkbox", { name: "Inmueble de lujo" }).check();
    await expect(page.getByRole("checkbox", { name: /Anuncio privado/ })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByLabel("Tu precio (USD / mes)")).toBeVisible();
    await page.evaluate(() => sessionStorage.clear());
  });

  test("propietario FSBO ve la consulta de un visitante anónimo con sus datos de contacto", async ({ page }) => {
    await demoLogin(page, /Propietario particular/);
    const lat = 10.49 + Math.random() * 0.01;
    const lng = -66.85 - Math.random() * 0.01;
    const created = await apiAs(page, "POST", "listings", {
      mode: "FSBO",
      listingType: "SALE",
      kind: "apartment",
      address: `Calle Review ${stamp}, Los Palos Grandes`,
      zone: "Los Palos Grandes",
      city: "Caracas",
      lat,
      lng,
      areaM2: 70 + Math.floor(Math.random() * 400),
      beds: 2,
      baths: 1,
      priceAmount: 99000,
    });
    expectOk(created.status);
    const id = created.json.id as string;
    await logout(page);
    const lead = await apiAs(page, "POST", "leads", { listingId: id, name: `Anónimo ${stamp}`, email: `anon-${stamp}@example.com`, phone: "+58 412 000 0000", message: `Consulta anónima ${stamp}` });
    expectOk(lead.status);
    await demoLogin(page, /Propietario particular/);
    await page.goto("/es/owner/listings");
    const box = page.getByTestId("owner-leads").filter({ hasText: `Anónimo ${stamp}` });
    await expect(box).toBeVisible();
    await expect(box.getByRole("link", { name: `anon-${stamp}@example.com` })).toHaveAttribute("href", `mailto:anon-${stamp}@example.com`);
    await expect(box.getByText(`Consulta anónima ${stamp}`)).toBeVisible();
    // "Marcar vendido" asks for confirmation first, and cancelling keeps it on sale.
    const card = page.locator("div.overflow-hidden", { has: page.getByTestId("owner-leads").filter({ hasText: `Anónimo ${stamp}` }) }).first();
    await card.getByRole("button", { name: "Marcar vendido" }).click();
    await expect(card.getByText("¿Marcar como vendido? Saldrá del buscador.")).toBeVisible();
    await card.getByRole("button", { name: "Cancelar" }).click();
    await expect(card.getByRole("button", { name: "Marcar vendido" })).toBeVisible();
    // Clean up: take the test listing off the market.
    await apiAs(page, "PATCH", `listings/${id}`, { status: "WITHDRAWN" });
  });

  test("cuenta: nombre de 1 letra y presupuesto con decimales muestran el error del campo sin llamar a la API", async ({ page }) => {
    await demoLogin(page, /Buscador/);
    await page.goto("/es/account");
    let patched = false;
    page.on("request", (r) => {
      if (r.method() === "PATCH" && r.url().endsWith("/api/v1/me")) patched = true;
    });
    const name = page.getByLabel("Nombre");
    const original = await name.inputValue();
    await expect(async () => {
      await name.fill("A");
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await expect(page.getByText("Entre 2 y 80 caracteres.")).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.getByLabel("Presupuesto (USD)").fill("1500.5");
    await expect(page.getByText("Un monto en USD mayor que 0, sin decimales.")).toBeVisible();
    expect(patched).toBe(false);
    // Fixing the fields saves; editing again brings back "Guardar cambios".
    await name.fill(original);
    await page.getByLabel("Presupuesto (USD)").fill("");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("button", { name: "Guardado" })).toBeVisible();
    await name.fill(`${original} `);
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeVisible();
  });

  test("registro con un email ya usado dice que la cuenta existe; login ⇄ registro conserva ?next", async ({ page }) => {
    await page.goto("/es/login?next=%2Fes%2Fsaved");
    await expect(page.getByRole("link", { name: "Regístrate" })).toHaveAttribute("href", "/es/register?next=%2Fes%2Fsaved");
    await page.goto("/es/register?next=%2Fes%2Fsaved");
    await expect(page.getByRole("link", { name: "Entra", exact: true })).toHaveAttribute("href", "/es/login?next=%2Fes%2Fsaved");
    await expect(async () => {
      await page.getByLabel("Nombre completo").fill("Dup Test");
      await page.getByLabel("Email").fill("seeker@gmail.com");
      await page.getByLabel("Contraseña").fill("NewPlace!2026x");
      await page.getByRole("button", { name: "Crear cuenta" }).click();
      await expect(page.getByText("Ya existe una cuenta con este email. Entra con tu contraseña.")).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 60_000 });
  });
});
