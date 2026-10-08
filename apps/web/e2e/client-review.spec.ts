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

/** Natural-language search from the filter bar (a combobox with zone typeahead); retried because a dev-server reload can wipe the field. */
async function nlSearch(page: Page, label: string, text: string, until: RegExp) {
  await expect(async () => {
    const input = page.getByRole("combobox", { name: label });
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
    // Price accepts being cleared while typing; no red error on arrival or while typing (only after leaving the field or
    // pressing "Continuar"); an empty price then blocks with a message.
    const price = page.getByLabel("Tu precio (USD)");
    await expect(page.getByText("Escribe un precio en USD mayor que 0, sin decimales.")).toHaveCount(0);
    await price.fill("");
    await expect(page.getByText("Escribe un precio en USD mayor que 0, sin decimales.")).toHaveCount(0);
    // "Continuar" stays tappable: it says what's missing and keeps the owner on this step.
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Escribe un precio en USD mayor que 0, sin decimales.")).toBeVisible();
    await expect(page.getByTestId("wizard-blocked")).toContainText("Tu precio en USD");
    await expect(page.getByText("Paso 5 de 6")).toBeVisible();
    // No currency conversion for an empty price.
    await expect(page.getByText(/≈ Bs\./)).toHaveCount(0);
    // An absurd figure (a missing zero): warned, never called a "quick sale"; the first "Continuar" stops on the
    // warning, the second (same figure) goes on.
    await price.fill("9");
    await expect(page.getByTestId("price-outlier")).toContainText("Muy por debajo del rango estimado — ¿faltan ceros?");
    await expect(page.getByText("Por debajo: venta rápida")).toHaveCount(0);
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.getByText("Paso 5 de 6")).toBeVisible();
    await page.getByRole("button", { name: "Continuar igualmente" }).click();
    await expect(page.getByText("Paso 6 de 6")).toBeVisible();
    await page.getByRole("button", { name: "Atrás", exact: true }).click();
    await price.fill("90000000");
    await expect(page.getByTestId("price-outlier")).toContainText("Muy por encima del rango — revisa la cifra");
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

  test("asistente a 360 px: el campo de dirección ocupa el ancho (país encima, no al lado)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await signIn(page, "owner.priv@gmail.com");
    await page.goto("/es/owner/new");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: "Alquiler", exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("¿Dónde está?").first()).toBeVisible();
    const address = page.getByRole("textbox", { name: "Dirección" });
    await expect(address).toBeVisible();
    const box = await address.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(280);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
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
    await page.goto("/en/compare");
    await page.evaluate((c) => localStorage.setItem("np-compare-v1", JSON.stringify(c)), ids.slice(0, 2));
    await page.reload();
    const table = page.getByRole("table");
    await expect(table.getByRole("cell", { name: "Location", exact: true })).toBeVisible();
    await expect(table.getByRole("cell", { name: "Area", exact: true })).toHaveCount(1);
    expect(dupKeys).toEqual([]);
    await page.evaluate(() => localStorage.removeItem("np-compare-v1"));
  });
  test("comparador en móvil: las 3 casas a la vista a la vez, cada fila con su nombre encima", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const some = await apiAs(page, "GET", "listings?type=SALE&take=3");
    const ids = (some.json.items as { id: string }[]).map((l) => l.id);
    expect(ids).toHaveLength(3);
    await page.goto(`/es/compare?ids=${ids.join(",")}`);
    const stack = page.locator("[data-compare-stack]");
    await expect(stack).toBeVisible();
    await expect(page.getByRole("table")).toBeHidden();
    // Three columns side by side, all inside the screen (no sideways scroll).
    const cols = await stack.locator(":scope > div").first().locator(":scope > div").evaluateAll((els) => els.map((e) => [e.getBoundingClientRect().left, e.getBoundingClientRect().right]));
    expect(cols).toHaveLength(3);
    for (const [l, r] of cols) {
      expect(l).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(390);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    // The row's name sits above its values.
    const term = stack.getByRole("term").filter({ hasText: /^Superficie$/ });
    const value = term.locator("xpath=following-sibling::dd[1]");
    expect((await term.boundingBox())!.y).toBeLessThan((await value.boundingBox())!.y);
  });

  test("comparador: no es un callejón sin salida («Ver ficha» abre la casa, «Pedir visita» su tarjeta de contacto)", async ({ page }) => {
    const some = await apiAs(page, "GET", "listings?type=SALE&take=2");
    const items = some.json.items as { id: string; slug: string; title_es: string }[];
    expect(items).toHaveLength(2);
    await page.goto(`/es/compare?ids=${items.map((l) => l.id).join(",")}`);
    const table = page.getByRole("table");
    // One distinct "best" mark (a pill), never a second ✓ next to a yes/no value.
    await expect(table.locator("[data-compare-best]").first()).toHaveText("Mejor");
    const visit = table.getByRole("link", { name: `Pedir visita: «${items[1].title_es}»` });
    await expect(visit).toHaveAttribute("href", `/es/listing/${items[1].slug}#contact`);
    await table.getByRole("link", { name: `Ver ficha: «${items[0].title_es}»` }).click();
    await expect(page).toHaveURL(new RegExp(`/es/listing/${items[0].slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: items[0].title_es })).toBeVisible();
  });
  test("comparador en móvil: la fila fija trae precio corto y acciones con el nombre de la casa", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    const some = await apiAs(page, "GET", "listings?type=SALE&take=3");
    const items = some.json.items as { id: string; slug: string; title_es: string }[];
    await page.goto(`/es/compare?ids=${items.map((l) => l.id).join(",")}`);
    const stack = page.locator("[data-compare-stack]");
    await expect(stack.locator("[data-compare-actions]").getByRole("link", { name: `Ver ficha: «${items[2].title_es}»` })).toBeVisible();
    await page.mouse.wheel(0, 900);
    const pinned = page.locator('[data-compare-pinned="on"]');
    await expect(pinned).toBeVisible();
    // Compact price ("USD 118k"), never cut ("USD 1…").
    for (const t of await pinned.locator(".np-num").allTextContents()) expect(t).toMatch(/^USD [\d.,]+[kM]?(\/[nm])?$/);
    await expect(pinned.getByRole("link", { name: `Ver ficha: «${items[0].title_es}»` })).toHaveAttribute("href", `/es/listing/${items[0].slug}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });

  test("móvil: la búsqueda abre en lista y la hoja «Filtros» se cierra con «Ver N casas»", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/es/search?type=LONG_RENT");
    await page.evaluate(() => sessionStorage.removeItem("np-search-view"));
    await page.reload();
    // List first, with the floating "Mapa" toggle and the bottom tab bar.
    await expect(page.locator('[data-search-sheet="list"]:visible')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Mapa", exact: true })).toBeVisible();
    await expect(page.locator("[data-tabbar]")).toBeVisible();
    await expect(async () => {
      await page.getByRole("button", { name: /^Filtros/ }).first().click();
      await expect(page.locator("#search-filters-sheet")).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.locator("#search-filters-sheet").getByRole("button", { name: "3+" }).click();
    await expect(page).toHaveURL(/beds=3/);
    await page.locator("#search-filters-sheet").getByRole("button", { name: /^Ver \d+ casas?$/ }).click();
    await expect(page.locator("#search-filters-sheet")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Quitar filtro: 3+ hab" })).toBeVisible();
    // Map toggle and back; the choice survives a reload (and a listing → Back).
    await page.getByRole("button", { name: "Mapa", exact: true }).click();
    await expect(page.locator('[data-search-sheet="map"]')).not.toHaveCount(0);
    await expect(page).toHaveURL(/view=map/);
    await page.reload();
    await expect(page.getByRole("button", { name: /^Lista · \d+/ })).toBeVisible();
    await page.getByRole("button", { name: /^Lista · \d+/ }).click();
    await expect(page.locator('[data-search-sheet="list"]:visible')).toBeVisible();
  });
  test("móvil: comparador y «Mapa» en una sola barra; la página (no un panel) hace scroll y lo recuerda", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/es/search?type=SALE");
    const first = await apiAs(page, "GET", "listings?type=SALE");
    const id = (first.json.items as { id: string }[])[0].id;
    await page.evaluate((c) => {
      localStorage.setItem("np-compare-v1", JSON.stringify(c));
      sessionStorage.removeItem("np-search-view");
    }, [id]);
    await page.reload();
    // One docked bar: "Mapa" + "Comparar (1)"; the floating tray stays out of /search on phones.
    const bar = page.locator("[data-search-toggle]");
    await expect(bar.getByRole("button", { name: "Mapa", exact: true })).toBeVisible();
    await expect(bar.getByRole("link", { name: /Comparar \(1\)/ })).toBeVisible();
    await expect(page.locator("[data-compare-tray]")).toBeHidden();
    // The document scrolls (the header can step away) and the position survives a listing → Back.
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 1400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(600);
    const y = await page.evaluate(() => window.scrollY);
    await expect(page.locator("html")).toHaveAttribute("data-np-header", "hidden");
    // Open a card that is already on screen with a real tap point (a locator click would scroll the page first). The
    // card's only link is its title, stretched over the whole card: a tap on the photo opens it.
    expect(await page.locator("#search-results [data-listing-card]").first().locator("a[href*='/listing/']").count()).toBe(1);
    const pt = await page.evaluate(() => {
      for (const a of Array.from(document.querySelectorAll("#search-results [data-listing-card]"))) {
        const r = a.getBoundingClientRect();
        const y = Math.max(r.top + 40, 160);
        if (y < r.bottom - 10 && y < window.innerHeight - 200) return { x: r.left + r.width / 2, y };
      }
      return null;
    });
    expect(pt).not.toBeNull();
    await page.mouse.click(pt!.x, pt!.y);
    await page.waitForURL(/\/listing\//);
    await page.goBack();
    await page.waitForURL(/\/search\?/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 40);
    // Map view: the bar keeps the comparator (count only) next to "Lista · N" and "Filtros".
    await bar.getByRole("button", { name: "Mapa", exact: true }).click();
    await expect(bar.getByRole("link", { name: "Comparar (1)" })).toBeVisible();
    await expect(bar.getByRole("button", { name: /^Lista · \d+/ })).toBeVisible();
    await page.evaluate(() => {
      localStorage.removeItem("np-compare-v1");
      sessionStorage.removeItem("np-search-view");
    });
  });
  test("búsqueda a 360/390/768: nada más ancho que la pantalla y «Buscar en esta zona» centrado, sin pisar el zoom", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.removeItem("np-search-view"));
    const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    for (const width of [360, 390, 768]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/es/search?type=SALE");
      await expect(page.locator("#search-results [data-listing-card]").first()).toBeVisible();
      // Nothing sticks out sideways (carousels and chip rows scroll inside their own clipped box).
      const wide = await page.evaluate((w) => {
        const out: string[] = [];
        if (document.documentElement.scrollWidth > w) out.push(`page ${document.documentElement.scrollWidth}`);
        for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
          const r = el.getBoundingClientRect();
          if (!r.width || (r.right <= w + 1 && r.left >= -1)) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden") continue;
          let clipped = false;
          for (let p = el.parentElement; p && !clipped; p = p.parentElement) clipped = getComputedStyle(p).overflowX !== "visible" || getComputedStyle(p).visibility === "hidden";
          if (!clipped) out.push(`${el.tagName}.${String(el.className).slice(0, 60)} ${Math.round(r.left)}–${Math.round(r.right)}`);
        }
        return out;
      }, width);
      expect(wide, `${width}px`).toEqual([]);
      // The sort select fits and is not stretched.
      const sort = await page.getByRole("combobox", { name: "Ordenar por" }).boundingBox();
      expect(sort!.x + sort!.width).toBeLessThanOrEqual(width);
      expect(sort!.width).toBeLessThanOrEqual(180);
      await expect(page.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("rec");
      // Map: after a zoom the button shows up under the tool row, centred, clear of the zoom buttons.
      await page.locator("[data-search-toggle]").getByRole("button", { name: "Mapa", exact: true }).click();
      await page.getByRole("button", { name: "Acercar", exact: true }).click();
      const area = page.locator("[data-search-area]");
      await expect(area).toBeVisible();
      const a = (await area.boundingBox())!;
      expect(a.x, `${width}px`).toBeGreaterThanOrEqual(0);
      expect(a.x + a.width, `${width}px`).toBeLessThanOrEqual(width);
      expect(Math.abs(a.x + a.width / 2 - width / 2), `${width}px centred`).toBeLessThanOrEqual(2);
      for (const name of ["Acercar", "Alejar"]) expect(overlaps(a, (await page.getByRole("button", { name, exact: true }).boundingBox())!), `${width}px vs ${name}`).toBe(false);
      expect(overlaps(a, (await page.locator("[data-map-tools]").boundingBox())!), `${width}px vs tools`).toBe(false);
    }
    await page.evaluate(() => sessionStorage.removeItem("np-search-view"));
  });

  test("tarjetas: el único enlace es el título (botones fuera del enlace) y un atajo lleva del filtro a los resultados", async ({ page }) => {
    await page.goto("/es/search?type=SALE");
    const card = page.locator("#search-results [data-listing-card]").first();
    await expect(card).toBeVisible();
    // One link per card, named by the title; no button inside a link anywhere in the results.
    await expect(card.getByRole("link")).toHaveCount(1);
    const title = (await card.getByRole("link").innerText()).trim();
    await expect(card.getByRole("link")).toHaveAccessibleName(title);
    expect(await page.locator("#search-results a button, #search-results a a").count()).toBe(0);
    // Owner listings say so in the agreed wording.
    for (const t of await page.locator('[data-testid="card-advisor"][data-owner]').allInnerTexts()) expect(t).toMatch(/Dueño\/a · sin intermediarios$/);
    // Skip link: the very first Tab stop on /search (the header's), visible on focus, lands on the results.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Saltar a los resultados" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await skip.press("Enter");
    await expect(page.locator("#search-results-grid")).toBeFocused();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest("[data-listing-card]"))).toBe(true);
  });

  test("búsqueda: una frase entendida a medias dice qué palabras no entendimos", async ({ page }) => {
    await page.goto("/es/search?type=SALE&kind=house&q=zzqx+casa+rara");
    await expect(page.locator('[data-testid="partly-understood"]:visible')).toHaveText("No entendimos «zzqx rara»; buscamos con el resto.");
    await expect(page.getByTestId("not-understood")).toHaveCount(0);
    // The box keeps only the leftover words (the rest is the «Casa» chip).
    await expect(page.getByRole("combobox", { name: "Cuéntanos con tus palabras qué buscas" })).toHaveValue("zzqx rara");
  });
  test("búsqueda: lo entendido pasa a filtros y sale de la caja; añadir palabras suma filtros", async ({ page }) => {
    await page.goto("/es/search?type=SALE");
    const box = page.getByRole("combobox", { name: "Cuéntanos con tus palabras qué buscas" });
    await nlSearch(page, "Cuéntanos con tus palabras qué buscas", "casa con piscina", /kind=house/);
    expect(new URL(page.url()).searchParams.get("q")).toBeNull();
    await expect(box).toHaveValue("");
    await expect(page.getByRole("button", { name: "Quitar filtro: Casa" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Quitar filtro: Piscina" })).toBeVisible();
    await expect(page.getByTestId("partly-understood")).toHaveCount(0);
    // Refining from the (empty) box keeps the chips already on.
    await nlSearch(page, "Cuéntanos con tus palabras qué buscas", "con terraza", /am=pool%2Cterrace|am=pool,terrace/);
    await expect(page.getByRole("button", { name: "Quitar filtro: Casa" })).toBeVisible();
    // Removing a chip leaves no stale text behind.
    await page.getByRole("button", { name: "Quitar filtro: Casa" }).click();
    await expect(page).not.toHaveURL(/kind=house/);
    await expect(box).toHaveValue("");
  });
  test("búsqueda: un enlace ?q= aplica lo que entendimos (redirige a filtros) y la nota es verdad", async ({ page }) => {
    await page.goto("/es/search?q=" + encodeURIComponent("casa en lechería con helipuerto"));
    await page.waitForURL(/zone=Lecher/);
    const url = new URL(page.url());
    expect(url.searchParams.get("kind")).toBe("house");
    expect(url.searchParams.get("type")).toBe("SALE");
    expect(url.searchParams.get("q")).toBe("helipuerto");
    await expect(page.locator('[data-testid="partly-understood"]:visible')).toHaveText("No entendimos «helipuerto»; buscamos con el resto.");
    await expect(page.getByRole("button", { name: "Quitar filtro: Lechería" })).toBeVisible();
    const api = await apiAs(page, "GET", "listings?type=SALE&zone=Lecher%C3%ADa&kind=house");
    await expect(page.getByText(/^\d+ resultados?$/).first()).toHaveText(new RegExp(`^${api.json.total} resultados?$`));
    // Removing a chip keeps the note true (we still didn't catch «helipuerto»); the box holds just that word.
    await page.getByRole("button", { name: "Quitar filtro: Lechería" }).click();
    await expect(page).not.toHaveURL(/zone=/);
    await expect(page.locator('[data-testid="partly-understood"]:visible')).toHaveText("No entendimos «helipuerto»; buscamos con el resto.");
    await expect(page.getByRole("combobox", { name: "Cuéntanos con tus palabras qué buscas" })).toHaveValue("helipuerto");
  });
  test("móvil: el mapa es un paso del historial; «Atrás» lo cierra sin salir de la búsqueda", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/es/search?type=SALE");
    await page.evaluate(() => sessionStorage.removeItem("np-search-view"));
    await page.reload();
    await expect(page.locator('[data-search-sheet="list"]:visible')).toBeVisible({ timeout: 15_000 });
    await page.locator("[data-search-toggle]").getByRole("button", { name: "Mapa", exact: true }).click();
    await expect(page).toHaveURL(/view=map/);
    await expect(page.locator('[data-search-sheet="map"]')).not.toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/es\/search\?type=SALE$/);
    await expect(page.locator('[data-search-sheet="list"]:visible')).toBeVisible();
    // Forward re-opens it; "Lista" closes it the same way (no stale map entry left behind).
    await page.goForward();
    await expect(page).toHaveURL(/view=map/);
    await page.getByRole("button", { name: /^Lista · \d+/ }).click();
    await expect(page).not.toHaveURL(/view=map/);
    await expect(page.locator('[data-search-sheet="list"]:visible')).toBeVisible();
  });
  test("móvil: sin resultados no hay «Mapa» en la barra y el aviso queda a la vista", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/es/search?type=SALE&zone=zzqx-nada&min=99000000");
    await expect(page.getByText("Aún no hay casas con todo eso")).toBeVisible();
    await expect(page.locator("[data-search-toggle]")).toHaveCount(0);
  });
  test("búsqueda: un texto que no entendemos lo dice y sugiere zonas; «Lech» sugiere Lechería", async ({ page }) => {
    await page.goto("/es/search?type=SALE&q=xyzzy+castillo");
    await expect(page.getByTestId("not-understood")).toContainText("No entendimos «xyzzy castillo»");
    await expect(page.getByText("Mientras tanto, todas las casas")).toBeVisible();
    const box = page.getByRole("combobox", { name: "Cuéntanos con tus palabras qué buscas" });
    await expect(async () => {
      await box.fill("casa en Lech");
      await expect(page.getByRole("option", { name: /Lechería/ }).first()).toBeVisible({ timeout: 1000 });
    }).toPass();
    await box.press("ArrowDown");
    await expect(box).toHaveAttribute("aria-activedescendant", /.+/);
    // Picking a place IS the search: one Enter completes the text and applies the zone at once (no second Enter).
    await box.press("Enter");
    await page.waitForURL(/zone=Lecher/);
    await expect(page.getByTestId("not-understood")).toHaveCount(0);
    // The understood words became filters, so the box doesn't keep them (box, chips and results agree)…
    await expect(box).not.toHaveValue(/Lechería/);
    // …and the map view shows the same search.
    if (await page.getByRole("button", { name: "Mapa", exact: true }).isVisible()) {
      await page.getByRole("button", { name: "Mapa", exact: true }).click();
      await expect(page).toHaveURL(/zone=Lecher/);
    }
  });
  test("buscador de la portada: un clic en una zona sugerida busca al instante", async ({ page }) => {
    await page.goto("/es");
    const box = page.getByRole("combobox", { name: "Describe la casa que buscas" }).first();
    await expect(async () => {
      await box.fill("Lech");
      await expect(page.getByRole("option", { name: /Lechería/ }).first()).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.getByRole("option", { name: /Lechería/ }).first().click();
    await page.waitForURL(/\/es\/search\?.*zone=Lecher/);
  });
  test("cabecera a 1280: «Vacacional» se ve y nada salta de línea", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/es/search");
    const nav = page.getByRole("navigation", { name: "Principal" });
    await expect(nav.getByRole("link", { name: "Vacacional" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Colección Privada" })).toBeVisible();
    // One line: every nav link on the same row, and the bar no wider than the screen.
    const tops = await nav.getByRole("link").evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
    // 1024 keeps only the essentials (and still fits).
    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(nav.getByRole("link", { name: "Vacacional" })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
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
    // Owner listings now open on "Pedir visita" (they take bookings too): switch to the message tab.
    await page.getByRole("tab", { name: "Mensaje" }).click();
    const send = page.getByRole("button", { name: "Enviar mensaje" });
    await expect(async () => {
      await send.click();
      await expect(page.getByText("Escribe tu nombre", { exact: true })).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(page.getByRole("textbox", { name: "Nombre" })).not.toHaveValue("");
    await expect(page.getByText("Escribe tu nombre", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Escribe un email válido", { exact: true })).toHaveCount(0);
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
    // The day shown is the second one (selected style). No time is pre-chosen: "Pedir visita" waits for a pick, then names it.
    await expect(page.getByRole("button", { name: "Pedir visita", exact: true })).toBeDisabled();
    await free.click();
    await expect(page.getByRole("button", { name: /^Pedir visita · / })).toBeEnabled();
    // Going back to the fully booked day explains why nothing can be picked.
    // Visible text is the short day ("lun 6"); the full date follows for screen readers.
    const dayButtons = page.locator("button", { hasText: /^(lun|mar|mié|jue|vie|sáb|dom) \d+/ });
    await dayButtons.first().click();
    await expect(page.getByText("Ese día ya está completo. Prueba con otro.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pedir visita", exact: true })).toBeDisabled();
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
      await page.getByRole("combobox", { name: "Cuéntanos con tus palabras qué buscas" }).fill("x");
      await expect(page.getByRole("combobox", { name: "Cuéntanos con tus palabras qué buscas" })).toHaveValue("x", { timeout: 1000 });
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
