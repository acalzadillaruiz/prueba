import { expect, test, type Page } from "@playwright/test";
import { apiAs, demoLogin, logout } from "./helpers";

const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

type ApiListing = { id: string; lat: number; lng: number; city: string; agentId?: string; status: string; priceAmount: number; baths: number; areaM2: number };

const resultsCount = async (page: Page) => {
  const header = page.getByText(/^\d[\d.]* resultados/).first();
  await expect(header).toBeVisible();
  return Number((await header.innerText()).match(/^([\d.]+)/)![1].replace(/\./g, ""));
};

test.describe.serial("Cliente: búsqueda, Hub y precalificación", () => {
  test("1 · el URL restaura orden y polígono; baños, m² y precio mínimo filtran", async ({ page }) => {
    const all = await apiAs(page, "GET", "listings?type=SALE");
    const items = all.json.items as ApiListing[];
    const anchor = items.find((l) => l.city === "Caracas") ?? items[0];
    const d = 0.03;
    const poly = [
      [anchor.lat - d, anchor.lng - d],
      [anchor.lat - d, anchor.lng + d],
      [anchor.lat + d, anchor.lng + d],
      [anchor.lat + d, anchor.lng - d],
    ]
      .map(([a, b]) => `${a.toFixed(5)},${b.toFixed(5)}`)
      .join(";");
    const qs = `type=SALE&sort=price-desc&poly=${poly}`;
    const inPoly = await apiAs(page, "GET", `listings?${qs}`);
    expect(inPoly.json.total).toBeGreaterThan(0);
    expect(inPoly.json.total).toBeLessThan(all.json.total);

    await page.goto(`/es/search?${qs.replace(/;/g, "%3B")}`);
    const sort = page.getByRole("combobox", { name: "Ordenar por" });
    await expect(sort).toHaveValue("price-desc");
    await expect(page.getByRole("button", { name: /Quitar filtro: Zona dibujada/ })).toBeVisible();
    await expect(page.getByText("en la zona que dibujaste")).toBeVisible();
    // The map draws the shape again (NightMap: dashed terracotta path; Google: polygon overlay).
    await expect(page.locator('[role="application"] path[data-shape="poly"]').first()).toBeAttached();
    expect(await resultsCount(page)).toBe(inPoly.json.total);

    // Reload keeps everything.
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Ordenar por" })).toHaveValue("price-desc");
    expect(await resultsCount(page)).toBe(inPoly.json.total);

    // Changing the sort writes it to the URL.
    await page.getByRole("combobox", { name: "Ordenar por" }).selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page).toHaveURL(/poly=/);

    // New filters narrow results.
    await page.goto("/es/search?type=SALE");
    const base = await resultsCount(page);
    await page.getByRole("button", { name: /Más filtros/ }).click();
    await page.getByRole("combobox", { name: "Baños" }).selectOption("3");
    await expect(page).toHaveURL(/baths=3/);
    const withBaths = await apiAs(page, "GET", "listings?type=SALE&baths=3");
    await expect.poll(() => resultsCount(page)).toBe(withBaths.json.total);
    expect(withBaths.json.total).toBeLessThan(base);
    for (const l of withBaths.json.items as ApiListing[]) expect(l.baths).toBeGreaterThanOrEqual(3);

    await page.getByRole("combobox", { name: "Superficie mínima" }).selectOption("200");
    await expect(page).toHaveURL(/m2=200/);
    const withM2 = await apiAs(page, "GET", "listings?type=SALE&baths=3&m2=200");
    await expect.poll(() => resultsCount(page)).toBe(withM2.json.total);
    expect(withM2.json.total).toBeLessThanOrEqual(withBaths.json.total);
    for (const l of withM2.json.items as ApiListing[]) expect(l.areaM2).toBeGreaterThanOrEqual(200);

    await page.goto("/es/search?type=SALE");
    await page.getByRole("combobox", { name: "Precio mínimo" }).selectOption("250000");
    await expect(page).toHaveURL(/min=250000/);
    const withMin = await apiAs(page, "GET", "listings?type=SALE&min=250000");
    await expect.poll(() => resultsCount(page)).toBe(withMin.json.total);
    expect(withMin.json.total).toBeLessThan(base);
    for (const l of withMin.json.items as ApiListing[]) expect(l.priceAmount).toBeGreaterThanOrEqual(250000);
  });

  test("1 · dibujar zona la guarda en el URL; «Guardar búsqueda» anónimo conserva la consulta al pedir login", async ({ page }) => {
    await page.goto("/es/search?type=SALE&beds=2&sort=price-asc");
    await page.getByRole("button", { name: /Dibujar zona/ }).click();
    const box = (await page.locator('[role="application"]').boundingBox())!;
    for (const [x, y] of [[0.5, 0.25], [0.82, 0.27], [0.84, 0.56], [0.55, 0.62]]) await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
    await page.getByRole("button", { name: /Cerrar zona/ }).click();
    await expect(page).toHaveURL(/poly=[-\d.,%3B;]+/);
    await expect(page.getByText("en la zona que dibujaste")).toBeVisible();
    await page.getByRole("button", { name: "Guardar búsqueda" }).click();
    await page.waitForURL(/\/es\/login/);
    const next = new URL(page.url()).searchParams.get("next")!;
    expect(next).toContain("/es/search?");
    expect(next).toContain("beds=2");
    expect(next).toContain("sort=price-asc");
    expect(next).toContain("poly=");
  });

  test("móvil 390 px: búsqueda y Hub sin scroll horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/es/search?type=SALE");
    await page.getByRole("button", { name: /Más filtros/ }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await demoLogin(page, /Buscador/);
    await page.goto("/es/app");
    await expect(page.getByText("Homebuyer Hub")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test("1 · guardar búsqueda dos veces no duplica y el radio se guarda en la consulta", async ({ page }) => {
    await demoLogin(page, /Buscador/);
    const query = `type=SALE&beds=2&radius=10.49000,-66.85000,1.${stamp.length}&zone=E2E-${stamp}`;
    const a = await apiAs(page, "POST", "me/searches", { name: `E2E radio ${stamp}`, query, frequency: "INSTANT" });
    expect(a.status).toBe(201);
    // Same filters in a different order (and with a sort) → the same saved search comes back.
    const b = await apiAs(page, "POST", "me/searches", { name: `E2E radio ${stamp}`, query: `zone=E2E-${stamp}&sort=price-asc&radius=10.49000,-66.85000,1.${stamp.length}&beds=2&type=SALE`, frequency: "INSTANT" });
    expect(b.status).toBe(200);
    expect(b.json.id).toBe(a.json.id);
    expect(b.json.query).toContain("radius=");
    const mine = await apiAs(page, "GET", "me/searches");
    expect((mine.json.items as { name: string }[]).filter((s) => s.name === `E2E radio ${stamp}`)).toHaveLength(1);
    await apiAs(page, "DELETE", `me/searches/${a.json.id}`);
  });

  test("2a · el buscador lee el hilo completo y responde", async ({ page }) => {
    // Seeker writes to an agent listing (creates lead + thread with the agent).
    await demoLogin(page, /Buscador/);
    const all = await apiAs(page, "GET", "listings?type=SALE");
    const target = (all.json.items as ApiListing[]).find((l) => l.agentId === "u-agent" && l.status === "ACTIVE")!;
    expect(target, "a SALE listing handled by the demo agent").toBeTruthy();
    const lead = await apiAs(page, "POST", "leads", { listingId: target.id, name: "Demo Buscador", email: "seeker@gmail.com", message: `Hola, pregunta E2E ${stamp}` });
    expect(lead.status).toBe(201);

    // The agent replies in that thread.
    await logout(page);
    await demoLogin(page, /Agente/);
    const inbox = await apiAs(page, "GET", "threads");
    const thread = (inbox.json.threads as { id: string; messages: { body: string }[] }[]).find((t) => t.messages.some((m) => m.body.includes(`pregunta E2E ${stamp}`)))!;
    expect(thread).toBeTruthy();
    expect((await apiAs(page, "POST", `threads/${thread.id}/messages`, { body: `Respuesta del agente ${stamp}` })).status).toBe(201);

    // Seeker sees it as unread in the Hub, opens the full thread and replies.
    await logout(page);
    await demoLogin(page, /Buscador/);
    await page.goto("/es/app");
    const row = page.getByRole("button", { name: /sin leer/ }).filter({ hasText: `Respuesta del agente ${stamp}` });
    await expect(row).toBeVisible();
    await row.click();
    const log = page.getByRole("log", { name: "Conversación" });
    await expect(log.getByText(`Hola, pregunta E2E ${stamp}`)).toBeVisible();
    await expect(log.getByText(`Respuesta del agente ${stamp}`)).toBeVisible();
    await page.getByRole("textbox", { name: "Tu respuesta" }).fill(`Gracias, respuesta del buscador ${stamp}`);
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    await expect(log.getByText(`Gracias, respuesta del buscador ${stamp}`)).toBeVisible();

    // Persisted, marked as read and visible to the agent.
    await page.reload();
    const again = page.getByRole("list", { name: "Conversaciones" }).getByRole("button").filter({ hasText: `Gracias, respuesta del buscador ${stamp}` });
    await expect(again).toBeVisible();
    await expect(again).not.toHaveAccessibleName(/sin leer/);
    await logout(page);
    await demoLogin(page, /Agente/);
    const after = await apiAs(page, "GET", "threads");
    const t2 = (after.json.threads as { id: string; messages: { body: string }[] }[]).find((t) => t.id === thread.id)!;
    expect(t2.messages.some((m) => m.body === `Gracias, respuesta del buscador ${stamp}`)).toBe(true);
  });

  test("2b · oferta desde el Hub con monto y nota; aparece con su estado", async ({ page }) => {
    await demoLogin(page, /Buscador/);
    await page.goto("/es/app");
    const amount = String(100000 + Math.floor(Math.random() * 900) * 100);
    const amountInput = page.getByLabel("Monto (USD)");
    // Hydration probe: once React handles the input, non-digits are stripped.
    await expect(async () => {
      await amountInput.fill(`${amount}x`);
      await expect(amountInput).toHaveValue(amount, { timeout: 1000 });
    }).toPass();
    await page.getByLabel("Nota para el agente (opcional)").fill(`Oferta E2E ${stamp}`);
    await page.getByRole("button", { name: "Enviar oferta" }).click();
    await expect(page.getByText("Listo. Tu oferta ya está con el agente.")).toBeVisible();
    const offers = page.getByRole("list", { name: "Ofertas enviadas" });
    await expect(offers.getByText(new RegExp(`Oferta E2E ${stamp}`))).toBeVisible();
    await page.reload();
    await expect(page.getByRole("list", { name: "Ofertas enviadas" }).getByRole("listitem").filter({ hasText: `Oferta E2E ${stamp}` }).getByText("Enviada")).toBeVisible();
  });

  test("2c · la precalificación se guarda y sobrevive a recargar", async ({ page }) => {
    await demoLogin(page, /Buscador/);
    await page.goto("/es/app");
    const slider = page.getByRole("slider", { name: "Precio", exact: true });
    const current = Number(await slider.inputValue());
    let price = String(50000 + (Math.floor(Math.random() * 80) + 1) * 5000);
    if (Number(price) === current) price = String(current === 500000 ? 495000 : current + 5000);
    const shown = Number(price).toLocaleString("es-VE");
    // Retry until hydrated: a fill before React attaches its handlers would be reset.
    await expect(async () => {
      await slider.fill(price);
      await expect(page.locator("label", { has: slider }).getByText(shown)).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.getByRole("slider", { name: "Plazo (años)" }).fill("20");
    await page.getByRole("button", { name: "Guardar y crear carta" }).click();
    await expect(page.getByRole("button", { name: "Precalificación guardada" })).toBeVisible();
    await expect(page.getByTestId("prequal-letter")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("slider", { name: "Precio", exact: true })).toHaveValue(price);
    await expect(page.getByRole("slider", { name: "Plazo (años)" })).toHaveValue("20");
    await expect(page.getByTestId("prequal-letter")).toContainText("20 años");
    await expect(page.getByRole("button", { name: "Precalificación guardada" })).toBeDisabled();

    const me = await apiAs(page, "GET", "me");
    expect(me.json.user.prequal).toMatchObject({ price: Number(price), years: 20 });
    // Out-of-range values are rejected by the API.
    expect((await apiAs(page, "PATCH", "me", { prequal: { price: 1, downPct: 150, years: 99, ratePct: -1 } })).status).toBe(422);
  });
});
