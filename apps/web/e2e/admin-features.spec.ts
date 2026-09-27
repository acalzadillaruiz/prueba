import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { apiAs, demoLogin } from "./helpers";

const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/newplace" });
const stamp = Date.now();

test.afterAll(async () => {
  await db.$disconnect();
});

test.describe("Admin: captación, leads y roles", () => {
  test("captación → «Convertir en inmueble» crea un borrador enlazado; duplicados y captadores no pueden", async ({ page }) => {
    const address = `Calle E2E Captación ${stamp}, Altamira`;
    const capture = { address, zone: "Altamira", ownerName: "Dueña E2E", phone: "+58 414 555 0000", kind: "apartment", areaM2: 60 + (stamp % 700), askingPrice: 123_000 + (stamp % 1000), lat: 10.3 + Math.random() * 0.2, lng: -67 + Math.random() * 0.2 };

    await demoLogin(page, /Dueño de agencia/);
    const created = await apiAs(page, "POST", "capture", capture);
    expect(created.status).toBe(201);
    expect(created.json.result).toBe("PENDING");

    await page.goto("/es/agency/capture");
    const row = page.getByRole("row").filter({ hasText: address });
    await row.getByRole("button", { name: "Convertir en inmueble" }).click();
    await page.getByRole("button", { name: "Crear borrador" }).click();
    await page.waitForURL(/\/es\/agency\/listings\/[^/]+\/edit/);
    const listingId = page.url().match(/listings\/([^/]+)\/edit/)![1];

    const c = await db.captureLead.findUniqueOrThrow({ where: { id: created.json.id } });
    expect(c.result).toBe("CAPTURED");
    expect(c.listingId).toBe(listingId);
    const l = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
    expect(l).toMatchObject({ status: "DRAFT", agencyId: c.agencyId, address, zone: "Altamira", city: "Caracas", areaM2: capture.areaM2, priceAmount: capture.askingPrice, kind: "apartment" });
    expect(l.titleEs.length).toBeGreaterThan(5);
    expect(await db.auditLog.count({ where: { action: "capture.convert", target: address } })).toBe(1);

    // Already converted → 409; the capture queue links to the listing.
    expect((await apiAs(page, "POST", `capture/${c.id}/convert`, {})).status).toBe(409);
    await page.goto("/es/agency/capture");
    await expect(page.getByRole("row").filter({ hasText: address }).getByRole("link", { name: "Ver inmueble" })).toHaveAttribute("href", `/es/agency/listings/${listingId}/edit`);

    // The same unit logged again is a DUPLICATE and cannot be converted.
    const dup = await apiAs(page, "POST", "capture", capture);
    expect(dup.json.result).toBe("DUPLICATE");
    expect((await apiAs(page, "POST", `capture/${dup.json.id}/convert`, {})).status).toBe(409);

    // Captors log captures but only managers convert.
    await page.context().clearCookies();
    await demoLogin(page, /Captador/);
    const other = await apiAs(page, "POST", "capture", { ...capture, address: `Calle E2E Captor ${stamp}`, lat: capture.lat + 0.01 });
    expect(other.json.result).toBe("PENDING");
    expect((await apiAs(page, "POST", `capture/${other.json.id}/convert`, {})).status).toBe(403);
  });

  test("leads: un responsable reasigna el lead a otro agente de la agencia (validado y auditado)", async ({ page }) => {
    const listing = await db.listing.findFirstOrThrow({ where: { agencyId: "ag-andes", agentId: "u-agent" } });
    const name = `E2E Reasignar ${stamp}`;
    const lead = await db.lead.create({
      data: { listingId: listing.id, agencyId: "ag-andes", agentId: "u-agent", name, email: `reasignar-${stamp}@example.com`, phone: "+58 412 000 1111", message: "Hola, ¿sigue disponible?", score: 50, nextAction: "CALL", events: { create: { type: "CREATED" } } },
    });
    try {
      await demoLogin(page, /Dueño de agencia/);
      await page.goto("/es/agency/leads");
      await page.getByRole("searchbox", { name: "Buscar leads" }).fill(`reasignar-${stamp}`);
      const row = page.getByRole("button", { name: new RegExp(name) });
      await expect(row).toHaveCount(1);
      await row.click();
      await page.getByRole("combobox", { name: "Agente asignado" }).selectOption("u-agent2");
      await expect(page.getByText("Reasignado a Andrés Mejías")).toBeVisible();

      expect((await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).agentId).toBe("u-agent2");
      expect(await db.leadEvent.count({ where: { leadId: lead.id, type: "ASSIGN" } })).toBe(1);
      expect(await db.auditLog.count({ where: { action: "lead.assign", target: name } })).toBe(1);

      // Only AGENTs of the same agency.
      expect((await apiAs(page, "PATCH", `leads/${lead.id}`, { agentId: "u-captor" })).status).toBe(422);
      expect((await apiAs(page, "PATCH", `leads/${lead.id}`, { agentId: "u-agent3" })).status).toBe(422);

      // Agents cannot reassign, not even their own leads.
      await db.lead.update({ where: { id: lead.id }, data: { agentId: "u-agent" } });
      await page.context().clearCookies();
      await demoLogin(page, /Agente/);
      expect((await apiAs(page, "PATCH", `leads/${lead.id}`, { agentId: "u-agent2" })).status).toBe(403);
      expect((await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).agentId).toBe("u-agent");
    } finally {
      await db.lead.delete({ where: { id: lead.id } });
    }
  });

  test("fotografía: el responsable asigna sesiones a fotógrafos de su agencia; el estado avanza y retrocede", async ({ page }) => {
    const listing = await db.listing.findFirstOrThrow({ where: { agencyId: "ag-andes" } });
    const date = new Date(Date.now() + 3 * 864e5).toISOString();
    await demoLogin(page, /Dueño de agencia/);
    expect((await apiAs(page, "POST", "media", { listingId: listing.id, photographerId: "u-agent", date })).status).toBe(422);
    const job = await apiAs(page, "POST", "media", { listingId: listing.id, photographerId: "u-photo", date });
    expect(job.status).toBe(201);
    try {
      await page.context().clearCookies();
      await demoLogin(page, /Fotógrafo/);
      expect((await apiAs(page, "PATCH", `media/${job.json.id}`, { status: "SHOOTING" })).status).toBe(200);
      expect((await apiAs(page, "PATCH", `media/${job.json.id}`, { status: "SCHEDULED" })).status).toBe(200);
      expect((await apiAs(page, "PATCH", `media/${job.json.id}`, { photographerId: "u-photo" })).status).toBe(403);
      expect((await db.mediaJob.findUniqueOrThrow({ where: { id: job.json.id } })).status).toBe("SCHEDULED");
      expect(await db.auditLog.count({ where: { action: "media.status", data: { path: ["jobId"], equals: job.json.id } } })).toBe(2);
    } finally {
      await db.mediaJob.delete({ where: { id: job.json.id } });
    }
  });

  test("leads: la primera respuesta pasa NEW → CONTACTED con evento en el historial y auditoría", async ({ page }) => {
    const listing = await db.listing.findFirstOrThrow({ where: { agencyId: "ag-andes", agentId: "u-agent" } });
    const name = `E2E Responder ${stamp}`;
    const lead = await db.lead.create({ data: { listingId: listing.id, agencyId: "ag-andes", agentId: "u-agent", name, email: `responder-${stamp}@example.com`, message: "Hola", events: { create: { type: "CREATED" } } } });
    try {
      await demoLogin(page, /Agente/);
      expect((await apiAs(page, "POST", `leads/${lead.id}/messages`, { body: "¡Hola! Te escribo de la agencia." })).status).toBe(201);
      expect((await apiAs(page, "POST", `leads/${lead.id}/messages`, { body: "¿Te llamo?" })).status).toBe(201);
      expect((await db.lead.findUniqueOrThrow({ where: { id: lead.id } })).stage).toBe("CONTACTED");
      expect(await db.leadEvent.count({ where: { leadId: lead.id, type: "STAGE" } })).toBe(1);
      expect(await db.auditLog.count({ where: { action: "lead.stage", target: name } })).toBe(1);
    } finally {
      await db.lead.delete({ where: { id: lead.id } });
    }
  });

  test("superadmin cambia roles desde la interfaz sin romper la coherencia usuario/agencia", async ({ page }) => {
    const seeker = await db.user.create({ data: { email: `e2e-rol-${stamp}@example.com`, name: `E2E Rol ${stamp}`, role: "SEEKER" } });
    const agency = await db.agency.create({ data: { name: `E2E Agencia ${stamp}`, slug: `e2e-agencia-${stamp}`, city: "Caracas", initials: "EA", status: "ACTIVE" } });
    const owner = await db.user.create({ data: { email: `e2e-dueno-${stamp}@example.com`, name: `E2E Dueño ${stamp}`, role: "AGENCY_OWNER", memberships: { create: { agencyId: agency.id, role: "AGENCY_OWNER" } } } });
    const member = await db.user.create({ data: { email: `e2e-agente-${stamp}@example.com`, name: `E2E Agente ${stamp}`, role: "AGENT", memberships: { create: { agencyId: agency.id, role: "AGENT" } } } });
    try {
      await demoLogin(page, /Superadmin/);
      await page.goto("/es/platform/users");
      const search = page.getByRole("textbox", { name: "Buscar" });

      // Non-agency user: personal roles only.
      await search.fill(seeker.email);
      const seekerRole = page.getByRole("combobox", { name: `Rol de ${seeker.name}` });
      await expect(seekerRole.locator('option[value="AGENT"]')).toHaveCount(0);
      await seekerRole.selectOption("OWNER_PRIVATE");
      await expect(seekerRole).toHaveValue("OWNER_PRIVATE");
      expect((await db.user.findUniqueOrThrow({ where: { id: seeker.id } })).role).toBe("OWNER_PRIVATE");
      expect((await apiAs(page, "PATCH", `platform/users/${seeker.id}`, { role: "AGENT" })).status).toBe(422);

      // Agency member: User.role and AgencyMember.role move together.
      await search.fill(member.email);
      const memberRole = page.getByRole("combobox", { name: `Rol de ${member.name}` });
      await expect(memberRole.locator('option[value="SEEKER"]')).toHaveCount(0);
      await memberRole.selectOption("CAPTOR");
      await expect(memberRole).toHaveValue("CAPTOR");
      expect((await db.user.findUniqueOrThrow({ where: { id: member.id } })).role).toBe("CAPTOR");
      expect((await db.agencyMember.findFirstOrThrow({ where: { userId: member.id } })).role).toBe("CAPTOR");
      expect((await apiAs(page, "PATCH", `platform/users/${member.id}`, { role: "SEEKER" })).status).toBe(422);

      // Never demote the last owner of an agency: the UI explains why.
      await search.fill(owner.email);
      await page.getByRole("combobox", { name: `Rol de ${owner.name}` }).selectOption("AGENT");
      await expect(page.getByRole("alert").filter({ hasText: "último dueño" })).toBeVisible();
      expect((await db.agencyMember.findFirstOrThrow({ where: { userId: owner.id } })).role).toBe("AGENCY_OWNER");
      const lastOwner = await apiAs(page, "PATCH", `platform/users/${owner.id}`, { role: "AGENT" });
      expect(lastOwner.status).toBe(422);
      expect(lastOwner.json.error.details.role).toBe("last owner");

      // The superadmin cannot demote itself.
      expect((await apiAs(page, "PATCH", "platform/users/u-super", { role: "SEEKER" })).status).toBe(422);
      expect((await db.user.findUniqueOrThrow({ where: { id: "u-super" } })).role).toBe("SUPERADMIN");
      expect(await db.auditLog.count({ where: { action: "user.role", target: { in: [seeker.email, member.email] } } })).toBe(2);

      // The audit page shows the change with readable labels.
      await page.goto(`/es/platform/audit?action=user`);
      await expect(page.getByTestId("audit-row").filter({ hasText: member.email }).first()).toContainText("Rol de usuario cambiado");
      await expect(page.getByTestId("audit-row").filter({ hasText: member.email }).first()).toContainText("Agente → Captador");
    } finally {
      await db.user.deleteMany({ where: { id: { in: [seeker.id, owner.id, member.id] } } });
      await db.agency.delete({ where: { id: agency.id } });
    }
  });
});
