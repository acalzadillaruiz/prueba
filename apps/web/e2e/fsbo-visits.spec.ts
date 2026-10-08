import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { demoLogin, logout } from "./helpers";

// FSBO visit booking happy path: a listing without visit hours offers "Pide una visita" (preferred times); the owner
// sets their hours from "Mis inmuebles"; a visitor books one of the slots; the owner sees and confirms it.
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/newplace" });
const stamp = Date.now().toString(36);
const id = `e2evh${stamp}`;
const title = `Apartamento E2E visitas ${stamp}`;

test.describe.serial("FSBO · horario de visitas y reserva", () => {
  test.beforeAll(async () => {
    await db.listing.create({
      data: {
        id, slug: id, titleEs: title, titleEn: `E2E visits flat ${stamp}`, bodyEs: "Luminoso y tranquilo.", bodyEn: "", address: `Calle E2E ${stamp}`, zone: "Altamira", city: "Caracas", state: "Miranda",
        lat: 10.4961, lng: -66.8466, kind: "apartment", listingType: "SALE", category: "RESIDENTIAL", priceAmount: 98000, areaM2: 85, yearBuilt: 2004, beds: 2, baths: 2,
        amenities: [], scenes: [], fingerprint: id, status: "ACTIVE", review: "APPROVED", privateListing: false, ownerUserId: "u-priv", publishedAt: new Date(),
      },
    });
  });
  test.afterAll(async () => {
    await db.messageThread.deleteMany({ where: { listingId: id } });
    await db.listing.deleteMany({ where: { id } });
    await db.emailOutbox.deleteMany({ where: { to: { contains: stamp } } });
    await db.$disconnect();
  });

  test("sin horario: «Pide una visita» con preferencias llega al dueño", async ({ page }) => {
    await page.goto(`/es/listing/${id}`);
    await expect(page.getByTestId("visit-ask")).toBeVisible();
    await page.getByRole("button", { name: /El fin de semana/ }).click();
    await page.getByLabel("Nombre").fill(`E2E Pregunta ${stamp}`);
    await page.getByLabel("Email").fill(`e2e-ask-${stamp}@example.com`);
    await page.getByRole("button", { name: "Pedir una visita", exact: true }).click();
    await expect(page.getByTestId("lead-done")).toContainText("Tu pedido de visita ya llegó");
    const lead = await db.lead.findFirstOrThrow({ where: { listingId: id } });
    expect(lead.message).toContain("El fin de semana");
  });

  test("el dueño pone su horario de visitas", async ({ page }) => {
    await demoLogin(page, /Propietario particular/);
    await page.goto("/es/owner/listings");
    const card = page.locator("div", { has: page.getByRole("link", { name: title }) }).filter({ has: page.getByRole("button", { name: /Horario de visitas/ }) }).last();
    await card.getByRole("button", { name: /Horario de visitas/ }).click();
    const form = page.getByTestId("visit-hours-form");
    await form.getByRole("radio", { name: /60 min/ }).click();
    for (const day of ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]) await form.getByRole("button", { name: `Añadir franja el ${day}` }).click();
    await form.getByRole("button", { name: /Guardar horario/ }).click();
    await expect(page.getByTestId("visit-hours-form")).toHaveCount(0);
    await expect(page.getByText(/Visitas: lun–dom 09:00–12:00 · 60 min/)).toBeVisible();
  });

  test("una visitante reserva una hora y el dueño la confirma", async ({ page }) => {
    await logout(page);
    await page.goto(`/es/listing/${id}`);
    await expect(page.getByText("Horarios que puso su dueño · Sin costo")).toBeVisible();
    // Name / email appear once a time is picked (progressive contact card).
    await page.locator("button:not([disabled])", { hasText: /^\d\d:\d\d$/ }).first().click();
    await page.getByLabel("Nombre").fill(`E2E Visita ${stamp}`);
    await page.getByLabel("Email").fill(`e2e-visit-${stamp}@example.com`);
    await page.getByRole("button", { name: /^Pedir visita · / }).click();
    await expect(page.getByTestId("lead-done")).toContainText(/Pendiente de que .+ la confirme/, { timeout: 15_000 });
    const tour = await db.tour.findFirstOrThrow({ where: { listingId: id } });
    expect([tour.agentId, tour.status]).toEqual(["u-priv", "REQUESTED"]);

    await demoLogin(page, /Propietario particular/);
    await page.goto("/es/owner/listings");
    const visits = page.getByTestId("owner-tours").filter({ hasText: `E2E Visita ${stamp}` });
    await expect(visits).toBeVisible();
    await visits.getByRole("button", { name: /Confirmar/ }).first().click();
    await expect(visits.getByText("Confirmada")).toBeVisible();
    expect((await db.tour.findUniqueOrThrow({ where: { id: tour.id } })).status).toBe("CONFIRMED");
  });
});
