import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

// Vacation rentals (SHORT_RENT) are asked about by dates, not visited: "Consultar disponibilidad" with arrival /
// departure, minimum nights, guests and an estimated total; the lead carries the stay in its message and as fields.
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/newplace" });
const stamp = Date.now().toString(36);
const email = `e2e-stay-${stamp}@example.com`;

type Item = { id: string; slug: string; listingType: string; priceAmount: number; pricePeriod?: string; shortRent?: { minNights: number; maxGuests: number; cleaningFee: number } };

/** "YYYY-MM-DD" in Caracas, `n` days from today. */
const day = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(new Date(Date.now() + n * 86_400_000));

test.afterAll(async () => {
  const leads = await db.lead.findMany({ where: { email: { contains: stamp } }, select: { id: true } });
  const ids = leads.map((l) => l.id);
  await db.messageThread.deleteMany({ where: { leadId: { in: ids } } });
  await db.leadEvent.deleteMany({ where: { leadId: { in: ids } } });
  await db.lead.deleteMany({ where: { id: { in: ids } } });
  await db.emailOutbox.deleteMany({ where: { to: { contains: stamp } } });
  await db.$disconnect();
});

test("alquiler vacacional: consultar disponibilidad por fechas (no «Pedir visita»)", async ({ page }) => {
  await db.rateLimit.deleteMany({ where: { key: { startsWith: "lead:" } } });
  const r = await page.request.get("/api/v1/listings?type=SHORT_RENT&limit=24");
  const items = ((await r.json()).items as Item[]).filter((i) => i.listingType === "SHORT_RENT" && i.pricePeriod === "night" && (i.shortRent?.minNights ?? 0) >= 2);
  test.skip(items.length === 0, "no vacation rental with a minimum stay in the seed");
  const l = items[0];
  const sr = l.shortRent!;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/es/listing/${l.slug}`);
  const panel = page.locator("#contact-panel");
  await expect(panel.getByTestId("stay-ask")).toBeVisible();
  await expect(panel.getByRole("tab", { name: "Disponibilidad" })).toHaveAttribute("aria-selected", "true");
  await expect(panel.getByRole("tab", { name: "Pedir visita" })).toHaveCount(0);
  // The phone bar names the same action.
  await expect(page.locator("[data-sticky-cta]")).toContainText("Disponibilidad");
  await expect(page.locator("[data-sticky-cta]")).not.toContainText("Visita");
  const send = panel.getByRole("button", { name: "Consultar disponibilidad", exact: true });
  await expect(send).toBeDisabled();

  // Arrival fills departure with the minimum stay.
  const arrival = day(10);
  await panel.getByLabel("Llegada").fill(arrival);
  await expect(panel.getByLabel("Salida")).toHaveValue(new Date(Date.parse(`${arrival}T00:00:00Z`) + sr.minNights * 86_400_000).toISOString().slice(0, 10));
  await expect(send).toBeEnabled();

  // Departure on the arrival day, then one night short of the minimum: plain errors, button off.
  await panel.getByLabel("Salida").fill(arrival);
  await expect(panel.getByRole("alert")).toContainText("La salida tiene que ser después de la llegada");
  await expect(send).toBeDisabled();
  await panel.getByLabel("Salida").fill(day(10 + sr.minNights - 1));
  await expect(panel.getByRole("alert")).toContainText(`La estancia mínima es de ${sr.minNights} noches`);
  await expect(send).toBeDisabled();

  // A valid stay: nights × price + cleaning.
  const nights = sr.minNights + 1;
  await panel.getByLabel("Salida").fill(day(10 + nights));
  await expect(panel.getByRole("alert")).toHaveCount(0);
  const total = l.priceAmount * nights + sr.cleaningFee;
  await expect(panel.getByTestId("stay-summary")).toContainText(`${nights} noches`);
  await expect(panel.getByTestId("stay-total")).toContainText(new Intl.NumberFormat("es-VE").format(total));

  // Guests: 1..max.
  const more = panel.getByRole("button", { name: "Un huésped más" });
  for (let i = 0; i < sr.maxGuests + 2 && (await more.isEnabled()); i++) await more.click();
  await expect(panel.getByTestId("stay-guests")).toHaveText(String(sr.maxGuests));
  await expect(more).toBeDisabled();
  await panel.getByRole("button", { name: "Un huésped menos" }).click();
  const guests = sr.maxGuests - 1;

  await panel.getByLabel("Nombre").fill(`E2E Estancia ${stamp}`);
  await panel.getByLabel("Email").fill(email);
  await panel.getByLabel("Mensaje (opcional)").fill("Llegamos tarde, ¿hay problema?");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await send.click();
  await expect(page.getByTestId("lead-done")).toContainText("Tu consulta ya llegó");

  const lead = await db.lead.findFirstOrThrow({ where: { email }, include: { events: true } });
  expect(lead.listingId).toBe(l.id);
  expect(lead.message).toContain("Consulta de disponibilidad");
  expect(lead.message).toContain(`${nights} noches`);
  expect(lead.message).toContain(`${guests} huéspedes`);
  expect(lead.message).toContain("Llegamos tarde");
  expect(lead.events[0].data).toMatchObject({ stay: { checkIn: arrival, checkOut: day(10 + nights), guests } });
});

test("API de leads: fechas de estancia validadas y solo en vacacionales", async ({ page }) => {
  await db.rateLimit.deleteMany({ where: { key: { startsWith: "lead:" } } });
  const r = await page.request.get("/api/v1/listings?type=SHORT_RENT&limit=24");
  const vac = ((await r.json()).items as Item[]).find((i) => i.listingType === "SHORT_RENT");
  test.skip(!vac, "no vacation rental in the seed");
  const base = { listingId: vac!.id, name: "E2E Fechas", email: `e2e-stay-api-${stamp}@example.com`, message: "Hola" };
  // Departure before arrival.
  expect((await page.request.post("/api/v1/leads", { data: { ...base, checkIn: day(12), checkOut: day(10) } })).status()).toBe(422);
  // More guests than the listing takes.
  expect((await page.request.post("/api/v1/leads", { data: { ...base, guests: (vac!.shortRent?.maxGuests ?? 50) + 1 } })).status()).toBe(422);
  // A sale listing doesn't take stay dates.
  const s = await page.request.get("/api/v1/listings?type=SALE&limit=1");
  const sale = ((await s.json()).items as Item[])[0];
  expect((await page.request.post("/api/v1/leads", { data: { ...base, listingId: sale.id, checkIn: day(10), checkOut: day(13) } })).status()).toBe(422);
});
