import { expect, test, type Page } from "@playwright/test";
import { apiAs, expectOk, logout, fillWizardBasics } from "./helpers";

// Regression tests for the client-flow review (search NL, owner wizard, owner inbox, account, auth).
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/** Signs in through the Auth.js demo provider with the page's own request context (no UI, no hydration race). */
async function signIn(page: Page, email: string) {
  const { csrfToken } = await (await page.request.get("/api/auth/csrf")).json();
  const r = await page.request.post("/api/auth/callback/demo", { form: { csrfToken, email, json: "true" }, maxRedirects: 0 });
  expect(r.status()).toBeLessThan(400);
  expectOk((await page.request.get("/api/v1/me")).status());
}

/** Natural-language search from the filter bar; retried because a dev-server reload can wipe the field. */
async function nlSearch(page: Page, label: string, text: string, until: RegExp) {
  await expect(async () => {
    const input = page.getByRole("textbox", { name: label });
    await input.fill(text);
    await expect(input).toHaveValue(text, { timeout: 1000 });
    await input.press("Enter");
    await page.waitForURL(until, { timeout: 5000 });
  }).toPass({ timeout: 60_000 });
}

test.describe("Cliente · regresiones de la revisión", () => {
  test("búsqueda NL: «2+ hab», rango «entre … y … mil», ciudad y sin falso «mascotas» por Petare", async ({ page }) => {
    await page.goto("/es/search");
    await nlSearch(page, "Cuéntanos con tus palabras qué buscas", "casa 2+ hab en Caracas entre 100 y 400 mil cerca de Petare", /beds=2/);
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
    await nlSearch(page, "Describe what you’re after in your own words", "apartment over 100 m2 in Altamira", /zone=Altamira/);
    const url = new URL(page.url());
    expect(url.searchParams.get("min")).toBeNull();
    expect(url.searchParams.get("max")).toBeNull();
    await expect(page.getByRole("button", { name: "Remove filter: Apartment" })).toBeVisible();
  });

  test("asistente: terreno sin habitaciones, año inválido bloquea con mensaje y la IA no escribe «hab.»", async ({ page }) => {
    await signIn(page, "owner.priv@gmail.com");
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
    await page.getByLabel("Superficie del terreno (m²)").fill("800");
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
    await signIn(page, "owner.priv@gmail.com");
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
    await fillWizardBasics(page);
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByLabel("Tu precio (USD / mes)")).toBeVisible();
    await page.evaluate(() => sessionStorage.clear());
  });

  test("propietario FSBO ve la consulta de un visitante anónimo con sus datos de contacto", async ({ page }) => {
    await signIn(page, "owner.priv@gmail.com");
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
    await signIn(page, "owner.priv@gmail.com");
    await page.goto("/es/owner/listings");
    const box = page.getByTestId("owner-leads").filter({ hasText: `Anónimo ${stamp}` });
    await expect(box).toBeVisible();
    await expect(box.getByRole("link", { name: `anon-${stamp}@example.com` })).toHaveAttribute("href", `mailto:anon-${stamp}@example.com`);
    await expect(box.getByText(`Consulta anónima ${stamp}`)).toBeVisible();
    // "Marcar vendido" asks for confirmation first, and cancelling keeps it on sale.
    const card = page.locator("div.overflow-hidden", { has: page.getByTestId("owner-leads").filter({ hasText: `Anónimo ${stamp}` }) }).first();
    await card.getByRole("button", { name: "Marcar vendido" }).click();
    await expect(card.getByText("¿Marcar como vendido? Dejará de aparecer en el buscador.")).toBeVisible();
    await card.getByRole("button", { name: "Cancelar" }).click();
    await expect(card.getByRole("button", { name: "Marcar vendido" })).toBeVisible();
    // Clean up: take the test listing off the market.
    await apiAs(page, "PATCH", `listings/${id}`, { status: "WITHDRAWN" });
  });

  test("cuenta: nombre de 1 letra y presupuesto con decimales muestran el error del campo sin llamar a la API", async ({ page }) => {
    await signIn(page, "seeker@gmail.com");
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
    await expect(page.getByText("Escribe un monto en USD mayor que 0, sin decimales.")).toBeVisible();
    expect(patched).toBe(false);
    // Fixing the fields saves; editing again brings back "Guardar cambios".
    await name.fill(original);
    await page.getByLabel("Presupuesto (USD)").fill("");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("button", { name: "Guardado" })).toBeVisible();
    await name.fill(`${original} `);
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeVisible();
  });

  test("guardar un id de inmueble inexistente responde 404 (no 500)", async ({ page }) => {
    await signIn(page, "seeker@gmail.com");
    const r = await apiAs(page, "POST", "me/saved", { listingId: `nope-${stamp}`, saved: true });
    expect(r.status).toBe(404);
  });

  test("registro con un email ya usado dice que la cuenta existe; login ⇄ registro conserva ?next", async ({ page }) => {
    await page.goto("/es/login?next=%2Fes%2Fsaved");
    await expect(page.getByRole("link", { name: "Regístrate" })).toHaveAttribute("href", "/es/register?next=%2Fes%2Fsaved");
    await page.goto("/es/register?next=%2Fes%2Fsaved");
    await expect(page.getByRole("link", { name: "Entra", exact: true })).toHaveAttribute("href", "/es/login?next=%2Fes%2Fsaved");
    await expect(async () => {
      await page.locator('input[name="name"]').fill("Dup Test");
      await page.locator('input[name="email"]').fill("seeker@gmail.com");
      await page.locator('input[name="password"]').fill("NewPlace!2026x");
      await page.getByRole("button", { name: "Crear cuenta" }).click();
      await expect(page.getByText("Ya tienes una cuenta con este email. Entra con tu contraseña.")).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 60_000 });
  });
  test("comparador en inglés: filas «Area» y «Location» distintas (sin claves duplicadas)", async ({ page }) => {
    await signIn(page, "seeker@gmail.com");
    const saved = await apiAs(page, "GET", "me/saved");
    let ids = saved.json.ids as string[];
    if (ids.length < 2) {
      const some = await apiAs(page, "GET", "listings?type=SALE&take=2");
      for (const l of some.json.items as { id: string }[]) await apiAs(page, "POST", "me/saved", { listingId: l.id, saved: true });
      ids = (await apiAs(page, "GET", "me/saved")).json.ids;
    }
    const dupKeys: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && m.text().includes("same key")) dupKeys.push(m.text());
    });
    await page.goto("/en/saved");
    await page.evaluate((c) => localStorage.setItem("np-compare-v1", JSON.stringify(c)), ids.slice(0, 2));
    await page.reload();
    const table = page.getByRole("table");
    await expect(table.getByRole("cell", { name: "Location", exact: true })).toBeVisible();
    await expect(table.getByRole("cell", { name: "Area", exact: true })).toHaveCount(1);
    expect(dupKeys).toEqual([]);
    await page.evaluate(() => localStorage.removeItem("np-compare-v1"));
  });

  test("móvil: el panel «Más filtros» se cierra con «Ver N resultados»", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/es/search?type=LONG_RENT");
    await expect(async () => {
      await page.getByRole("button", { name: /Más filtros/ }).click();
      await expect(page.locator("#search-more-filters")).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.locator("#search-more-filters").getByRole("button", { name: /^Ver \d+ resultados?$/ }).click();
    await expect(page.locator("#search-more-filters")).toHaveCount(0);
  });
  test("ficha: si se envía antes de que llegue la sesión, los errores se limpian al autocompletar y luego se envía", async ({ page }) => {
    await signIn(page, "seeker@gmail.com");
    const list = await apiAs(page, "GET", "listings?type=LONG_RENT");
    const fsbo = (list.json.items as { slug: string; agentId?: string | null }[]).find((l) => !l.agentId)!;
    // Slow session: the visitor presses "Enviar" before name/email are pre-filled.
    await page.route("**/api/v1/me/session", async (route) => {
      await new Promise((r) => setTimeout(r, 4000));
      await route.continue();
    });
    await page.goto(`/es/listing/${fsbo.slug}`);
    const send = page.getByRole("button", { name: "Enviar mensaje" });
    await expect(async () => {
      await send.click();
      await expect(page.getByText("Nombre: Demasiado corto.")).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(page.getByRole("textbox", { name: "Nombre" })).not.toHaveValue("");
    await expect(page.getByText("Nombre: Demasiado corto.")).toHaveCount(0);
    await expect(page.getByText("Escribe un email válido.")).toHaveCount(0);
    await page.getByRole("textbox", { name: "Mensaje" }).fill(`Consulta tras autocompletar ${stamp}`);
    await send.click();
    await expect(page.getByTestId("lead-done")).toBeVisible();
  });
  test("«Guardar búsqueda» nombra la alerta con todos los filtros activos", async ({ page }) => {
    await signIn(page, "seeker@gmail.com");
    const km = (1 + Math.random() * 3).toFixed(3);
    const session = page.waitForResponse("**/api/v1/me/session");
    await page.goto(`/es/search?type=LONG_RENT&pub=7d&furnished=1&radius=10.49000,-66.85000,${km}`);
    await session;
    await expect(async () => {
      // Click only while it still offers to save (a slow response turns it into "Búsqueda guardada").
      const save = page.getByRole("button", { name: "Guardar búsqueda" });
      if (await save.count()) await save.click({ timeout: 2000 });
      await expect(page.getByRole("button", { name: "Búsqueda guardada" }).first()).toBeVisible({ timeout: 5000 });
    }).toPass();
    const list = await apiAs(page, "GET", "me/searches");
    const s = (list.json.items as { name: string; query: string }[]).find((x) => x.query.includes(km))!;
    expect(s.name).toContain("Alquilar");
    expect(s.name).toContain("Últimos 7 días");
    expect(s.name).toContain("Amoblado");
    expect(s.name).toContain(`Radio ${(+km).toLocaleString("es-VE", { maximumFractionDigits: 1 })} km`);
  });
  test("ficha: con el primer día sin huecos libres, abre en el primer día con horarios y se puede pedir visita", async ({ page }) => {
    // Calendar whose first day is fully booked (served by a stub; the rest of the page is real).
    await page.route("**/api/v1/listings/*/slots", async (route) => {
      const r = await route.fetch();
      const data = await r.json();
      if (data.days?.length >= 2) {
        data.days[0].hours = data.days[0].hours.map((h: { available: boolean }) => ({ ...h, available: false }));
        data.days[1].hours = data.days[1].hours.map((h: { available: boolean }, i: number) => ({ ...h, available: i === 0 }));
      }
      await route.fulfill({ response: r, json: data });
    });
    await page.goto("/es/listing/los-palos-grandes-3h-118m-l5u136");
    const free = page.locator("button:not([disabled])", { hasText: /^\d\d:00$/ });
    await expect(free).toHaveCount(1);
    // The day shown is the second one (selected style), and "Solicitar visita" is enabled with the free slot pre-chosen.
    await expect(page.getByRole("button", { name: "Solicitar visita" })).toBeEnabled();
    // Going back to the fully booked day explains why nothing can be picked.
    // Visible text is the short day ("lun 6"); the full date follows for screen readers.
    const dayButtons = page.locator("button", { hasText: /^(lun|mar|mié|jue|vie|sáb|dom) \d+/ });
    await dayButtons.first().click();
    await expect(page.getByText("Ese día ya está completo. Prueba con otro.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Solicitar visita" })).toBeDisabled();
  });
  test("sesión aún cargando: pulsar «Guardar búsqueda» no manda al login a un usuario ya autenticado", async ({ page }) => {
    await signIn(page, "seeker@gmail.com");
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route("**/api/v1/me/session", async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto("/es/search?type=SALE&beds=4");
    const save = page.getByRole("button", { name: "Guardar búsqueda" });
    // Hydrated (the NL box reacts) but the session is still pending.
    await expect(async () => {
      await page.getByRole("textbox", { name: "Cuéntanos con tus palabras qué buscas" }).fill("x");
      await expect(page.getByRole("textbox", { name: "Cuéntanos con tus palabras qué buscas" })).toHaveValue("x", { timeout: 1000 });
    }).toPass();
    await save.click();
    await page.waitForTimeout(1500);
    expect(new URL(page.url()).pathname).toBe("/es/search");
    release();
    await expect(page.getByRole("link", { name: /Daniel/ })).toBeVisible();
    await save.click();
    await expect(page.getByRole("button", { name: "Búsqueda guardada" }).first()).toBeVisible();
  });
});
