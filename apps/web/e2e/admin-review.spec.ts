import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { apiAs, demoLogin, logout } from "./helpers";

/** Regression tests for defects found in the admin review (agency back-office + platform console). */
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/newplace" });
const stamp = Date.now();
const listings: string[] = [];
const leads: string[] = [];
const agencies: string[] = [];
const reports: string[] = [];

let seq = 0;
function draft(extra: Record<string, unknown> = {}) {
  seq++;
  return {
    mode: "AGENCY",
    listingType: "SALE",
    kind: "apartment",
    address: `Av. Revisión Admin ${stamp}-${seq}, Edif. Norte`,
    zone: "Altamira",
    city: "Caracas",
    lat: 10.25 + ((stamp / 1000 + seq * 131) % 1000) / 10_000,
    lng: -66.6 - ((stamp / 3000 + seq * 71) % 1000) / 10_000,
    areaM2: 70 + ((stamp + seq * 41) % 600),
    beds: 2,
    baths: 2,
    parking: 1,
    priceAmount: 150_000,
    publish: false,
    ...extra,
  };
}

async function createListing(page: Page, data: Record<string, unknown>) {
  const r = await apiAs(page, "POST", "listings", data);
  expect(r.status, JSON.stringify(r.json)).toBe(201);
  listings.push(r.json.id);
  return r.json.id as string;
}

// Minimal PNG (signature + IHDR): the upload API sniffs the magic bytes.
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000050001", "hex");

test.afterAll(async () => {
  try {
    await db.tour.deleteMany({ where: { leadId: { in: leads } } });
    await db.leadEvent.deleteMany({ where: { leadId: { in: leads } } });
    await db.lead.deleteMany({ where: { id: { in: leads } } });
    await db.moderationReport.deleteMany({ where: { id: { in: reports } } });
    await db.mandate.deleteMany({ where: { listingId: { in: listings } } });
    await db.messageThread.deleteMany({ where: { listingId: { in: listings } } });
    await db.listing.deleteMany({ where: { id: { in: listings } } });
    await db.agency.deleteMany({ where: { id: { in: agencies } } });
    await db.invitation.deleteMany({ where: { email: { contains: `review-${stamp}` } } });
  } catch {
    /* leave test rows if other data now references them */
  }
  await db.$disconnect();
});

test.describe("Revisión admin: regresiones", () => {
  test("proponer visita no retrocede un lead en OFERTA; un lead CONTACTADO pasa a VISITA con evento y auditoría", async ({ page }) => {
    const listing = await db.listing.findFirstOrThrow({ where: { agencyId: "ag-andes", agentId: "u-agent" } });
    const mk = (stage: "OFFER" | "CONTACTED", n: number) =>
      db.lead.create({ data: { listingId: listing.id, agencyId: "ag-andes", agentId: "u-agent", name: `E2E Visita ${stage} ${stamp}`, email: `visita-${n}-${stamp}@example.com`, message: "Hola", stage, score: 60, nextAction: "PROPOSE_TOUR", firstResponseAt: new Date() } });
    const offer = await mk("OFFER", 1);
    const contacted = await mk("CONTACTED", 2);
    leads.push(offer.id, contacted.id);
    await demoLogin(page, /Agente/);
    // Far-away, odd times so they never clash with seeded tours.
    const at = (days: number) => new Date(Date.now() + days * 864e5 + ((stamp % 97) + 7) * 60e3).toISOString();
    expect((await apiAs(page, "POST", `leads/${offer.id}/tour`, { start: at(41) })).status).toBe(200);
    expect((await db.lead.findUniqueOrThrow({ where: { id: offer.id } })).stage).toBe("OFFER");
    expect((await apiAs(page, "POST", `leads/${contacted.id}/tour`, { start: at(43) })).status).toBe(200);
    expect((await db.lead.findUniqueOrThrow({ where: { id: contacted.id } })).stage).toBe("TOUR");
    expect(await db.leadEvent.count({ where: { leadId: contacted.id, type: "STAGE" } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "lead.stage", target: contacted.name } })).toBeGreaterThan(0);
  });

  test("fotos: borrar la portada promueve la siguiente; el editor muestra subida/comisión según el rol", async ({ page }) => {
    await demoLogin(page, /Dueño de agencia/);
    const id = await createListing(page, draft());
    for (const name of ["a.png", "b.png"]) {
      const r = await page.request.post(`/api/v1/listings/${id}/photos`, { multipart: { files: { name, mimeType: "image/png", buffer: PNG } } });
      expect(r.status()).toBe(201);
    }
    const photos = await db.listingPhoto.findMany({ where: { listingId: id }, orderBy: { order: "asc" } });
    expect(photos.map((p) => p.isCover)).toEqual([true, false]);
    const r = await apiAs(page, "PATCH", `listings/${id}/photos`, { remove: photos[0].id });
    expect(r.status).toBe(200);
    expect(r.json.photos).toHaveLength(1);
    expect(r.json.photos[0]).toMatchObject({ id: photos[1].id, isCover: true });

    await page.goto(`/es/agency/listings/${id}/edit`);
    await expect(page.getByText("Comisión estimada")).toBeVisible();
    await expect(page.getByRole("button", { name: "Subir" })).toBeVisible();

    await logout(page);
    await demoLogin(page, /Fotógrafo/);
    await page.goto(`/es/agency/listings/${id}/edit`);
    await expect(page.getByRole("heading", { name: "Editar inmueble" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Subir" })).toBeVisible();
    await expect(page.getByText("Comisión estimada")).toHaveCount(0);

    await logout(page);
    await demoLogin(page, /Captador/);
    await page.goto(`/es/agency/listings/${id}/edit`);
    await expect(page.getByRole("heading", { name: "Editar inmueble" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Subir" })).toHaveCount(0);
    await expect(page.getByText("Comisión estimada")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Eliminar" })).toHaveCount(0);
  });

  test("panel del agente: sin botón CSV (informes es solo para gerentes) y su ranking es solo él", async ({ page }) => {
    await demoLogin(page, /Agente/);
    await page.goto("/es/agency");
    await expect(page.getByRole("heading", { name: "Mi rendimiento" })).toBeVisible();
    await expect(page.getByRole("link", { name: "CSV" })).toHaveCount(0);
    await expect(page.getByText("Mis resultados")).toBeVisible();
  });

  test("aprobación: el backoffice puede rechazar; al editarlo el agente lo reenvía a revisión", async ({ page }) => {
    await demoLogin(page, /Agente/);
    const id = await createListing(page, draft({ publish: true }));
    expect((await db.listing.findUniqueOrThrow({ where: { id } })).review).toBe("PENDING");
    await logout(page);
    await demoLogin(page, /Dueño de agencia/);
    await page.goto("/es/agency/listings");
    await page.getByRole("button", { name: /Por aprobar/ }).click();
    const row = page.getByRole("row").filter({ has: page.locator(`a[href="/es/agency/listings/${id}/edit"]`) });
    await row.getByRole("button", { name: "Rechazar publicación" }).click();
    await expect.poll(async () => (await db.listing.findUniqueOrThrow({ where: { id } })).review).toBe("REJECTED");
    await page.getByRole("button", { name: "Todos" }).click();
    await expect(page.getByRole("row").filter({ has: page.locator(`a[href="/es/agency/listings/${id}/edit"]`) }).getByText("Rechazado")).toBeVisible();
    await logout(page);
    await demoLogin(page, /Agente/);
    expect((await apiAs(page, "PATCH", `listings/${id}`, { priceAmount: 149_000 })).status).toBe(200);
    expect((await db.listing.findUniqueOrThrow({ where: { id } })).review).toBe("PENDING");
  });

  test("encargos: la agencia ve el encargo, asigna agente y lo publica desde Inmuebles; un encargo cerrado no se reabre", async ({ page }) => {
    await demoLogin(page, /Propietario particular/);
    const id = await createListing(page, draft({ mode: "MANDATE", agencyId: "ag-andes" }));
    const mandate = await db.mandate.findFirstOrThrow({ where: { listingId: id } });
    const agent = await db.user.findUniqueOrThrow({ where: { id: "u-agent" } });
    const title = (await db.listing.findUniqueOrThrow({ where: { id } })).titleEs;
    await logout(page);

    await demoLogin(page, /Dueño de agencia/);
    await page.goto("/es/agency/listings");
    const row = page.locator(`[data-mandate="${mandate.id}"]`);
    await expect(row.getByText("Solicitado")).toBeVisible();
    await row.getByRole("combobox").selectOption(agent.id);
    await expect(row.getByText("Asignado")).toBeVisible();
    await row.getByRole("button", { name: "Publicar" }).click();
    await expect(row).toHaveCount(0);
    const [m, l] = await Promise.all([db.mandate.findUniqueOrThrow({ where: { id: mandate.id } }), db.listing.findUniqueOrThrow({ where: { id } })]);
    expect(m).toMatchObject({ status: "ACTIVE", agentId: agent.id });
    expect(l).toMatchObject({ status: "ACTIVE", agencyId: "ag-andes", agentId: agent.id, privateListing: false });
    expect(await db.auditLog.count({ where: { action: "mandate.update", target: title } })).toBe(2);
    // Closed mandates can't be reassigned (that used to flip them back to ASSIGNED).
    expect((await apiAs(page, "PATCH", `mandates/${mandate.id}`, { agentId: "u-agent2" })).status).toBe(409);
  });

  test("moderación: retirar desde un reporte pide confirmación y lo retirado por la agencia no se «restaura»", async ({ page }) => {
    await demoLogin(page, /Dueño de agencia/);
    const reported = await createListing(page, draft({ publish: true }));
    const withdrawn = await createListing(page, draft({ publish: true }));
    expect((await apiAs(page, "DELETE", `listings/${withdrawn}`)).status).toBe(200);
    const rep = await db.moderationReport.create({ data: { listingId: reported, title: `E2E Reporte ${stamp}`, reasonEs: "Fotos engañosas", reasonEn: "Misleading photos", reporter: "e2e", agency: "Andes Prime", severity: "high" } });
    reports.push(rep.id);
    await logout(page);

    await demoLogin(page, /Superadmin/);
    await page.goto("/es/platform/moderation");
    const agencyRow = page.locator(`[data-listing="${withdrawn}"]`);
    await expect(agencyRow.getByRole("button", { name: "Apagar" })).toBeVisible();
    await expect(agencyRow.getByRole("button", { name: "Restaurar" })).toHaveCount(0);

    const card = page.locator("div.border-t, div.first\\:border-0").filter({ hasText: `E2E Reporte ${stamp}` }).first();
    await card.getByRole("button", { name: "Retirar" }).click();
    expect((await db.listing.findUniqueOrThrow({ where: { id: reported } })).status).toBe("ACTIVE");
    await page.getByRole("textbox", { name: "Motivo de la retirada" }).fill("Fotos engañosas (E2E)");
    await page.getByRole("button", { name: "Confirmar retirada" }).click();
    await expect.poll(async () => (await db.listing.findUniqueOrThrow({ where: { id: reported } })).takedownReason).toBe("Fotos engañosas (E2E)");
    expect((await db.moderationReport.findUniqueOrThrow({ where: { id: rep.id } })).resolved).toBe(true);
  });

  test("plataforma: una agencia con nombre repetido → 409 (no 500); agencia inexistente → 404", async ({ page }) => {
    await demoLogin(page, /Superadmin/);
    const name = `E2E Agencia ${stamp}`;
    const a = await apiAs(page, "POST", "platform/agencies", { name, city: "Caracas" });
    expect(a.status).toBe(201);
    agencies.push(a.json.id);
    const again = await apiAs(page, "POST", "platform/agencies", { name, city: "Caracas" });
    expect(again.status).toBe(409);
    expect(again.json.error.code).toBe("CONFLICT");
    expect((await apiAs(page, "PATCH", `platform/agencies/nope-${stamp}`, { plan: "PRO" })).status).toBe(404);
  });

  test("equipo: reinvitar el mismo email no duplica la invitación pendiente en la lista", async ({ page }) => {
    await demoLogin(page, /Dueño de agencia/);
    await page.goto("/es/agency/team");
    const email = `review-${stamp}@example.com`;
    for (const role of ["Agente", "Captador"]) {
      await page.getByRole("textbox", { name: "Email" }).fill(email);
      await page.getByRole("combobox", { name: "Rol" }).last().selectOption({ label: role });
      await page.getByRole("button", { name: "Enviar invitación" }).click();
      await expect(page.getByRole("button", { name: `Revocar invitación a ${email}` })).toHaveCount(1);
    }
    expect(await db.invitation.count({ where: { email, acceptedAt: null } })).toBe(1);
    await page.getByRole("button", { name: `Revocar invitación a ${email}` }).click();
    await expect(page.getByRole("button", { name: `Revocar invitación a ${email}` })).toHaveCount(0);
    expect(await db.auditLog.count({ where: { action: "team.invite.revoke", target: email } })).toBe(1);
  });
});
