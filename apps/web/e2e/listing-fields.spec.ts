import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { apiAs, demoLogin, logout } from "./helpers";

/**
 * 1 · Mandates can't be used to publish under an agency's name (owner-created MANDATE listings stay private
 *     until the agency accepts; the owner can't flip status/review/visibility meanwhile).
 * 2 · Type-specific fields (brief §5): vacation, commercial, luxury — API bounds, wizard and editor.
 */
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/newplace" });
const stamp = Date.now();
const created: string[] = [];
let suspendedId: string | null = null;

// Distinct coordinates / areas per listing so the anti-duplicate check never trips between runs.
let seq = 0;
function base(extra: Record<string, unknown> = {}) {
  seq++;
  return {
    mode: "FSBO",
    listingType: "SALE",
    kind: "apartment",
    address: `Calle E2E ${stamp}-${seq}, Edif. Campos`,
    zone: "Altamira",
    city: "Caracas",
    lat: 10.3 + ((stamp / 1000 + seq * 97) % 1000) / 10_000,
    lng: -66.7 - ((stamp / 7000 + seq * 53) % 1000) / 10_000,
    areaM2: 60 + ((stamp + seq * 37) % 500),
    beds: 2,
    baths: 1,
    parking: 1,
    priceAmount: 100_000,
    ...extra,
  };
}

async function create(page: Page, data: Record<string, unknown>) {
  const r = await apiAs(page, "POST", "listings", data);
  if (r.status === 201) created.push(r.json.id);
  return r;
}

test.afterAll(async () => {
  try {
    await db.mandate.deleteMany({ where: { listingId: { in: created } } });
    await db.listing.deleteMany({ where: { id: { in: created } } });
  } catch {
    /* leave test rows if other data now references them */
  }
  if (suspendedId) await db.agency.delete({ where: { id: suspendedId } }).catch(() => {});
  await db.$disconnect();
});

test.describe("1 · Encargo (MANDATE) no publica bajo el nombre de la agencia", () => {
  test("se crea privado/pending sin agencia; el dueño no puede publicarlo; la agencia lo vincula al aceptar", async ({ page }) => {
    await demoLogin(page, /Propietario particular/);

    // unknown / suspended agency → 422
    expect((await create(page, base({ mode: "MANDATE", agencyId: `nope-${stamp}` }))).status).toBe(422);
    const susp = await db.agency.create({ data: { name: `E2E Suspendida ${stamp}`, slug: `e2e-susp-${stamp}`, city: "Caracas", initials: "ES", status: "SUSPENDED" } });
    suspendedId = susp.id;
    expect((await create(page, base({ mode: "MANDATE", agencyId: susp.id }))).status).toBe(422);

    // valid mandate
    const r = await create(page, base({ mode: "MANDATE", agencyId: "ag-andes", privateListing: false, publish: true }));
    expect(r.status).toBe(201);
    const id = r.json.id as string;
    const row = await db.listing.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe("DRAFT");
    expect(row.review).toBe("PENDING");
    expect(row.privateListing).toBe(true);
    expect(row.agencyId).toBeNull();
    const mandate = await db.mandate.findFirstOrThrow({ where: { listingId: id } });
    expect(mandate.status).toBe("REQUESTED");
    expect(mandate.agencyId).toBe("ag-andes");

    // owner can't publish it / make it public / self-approve while the mandate is pending
    expect((await apiAs(page, "PATCH", `listings/${id}`, { status: "ACTIVE" })).status).toBe(403);
    expect((await apiAs(page, "PATCH", `listings/${id}`, { privateListing: false })).status).toBe(403);
    expect((await apiAs(page, "PATCH", `listings/${id}`, { review: "APPROVED" })).status).toBe(403);
    // …but can still edit its content
    expect((await apiAs(page, "PATCH", `listings/${id}`, { priceAmount: 99_000 })).status).toBe(200);
    const after = await db.listing.findUniqueOrThrow({ where: { id } });
    expect([after.status, after.review, after.privateListing, after.agencyId]).toEqual(["DRAFT", "PENDING", true, null]);

    // not public
    await logout(page);
    expect((await apiAs(page, "GET", `listings/${id}`)).status).toBe(404);

    // the agency accepts (assigns an agent) → only now is the listing linked to the agency
    await demoLogin(page, /Dueño de agencia/);
    expect((await apiAs(page, "PATCH", `mandates/${mandate.id}`, { agentId: "u-agent" })).status).toBe(200);
    const linked = await db.listing.findUniqueOrThrow({ where: { id } });
    expect(linked.agencyId).toBe("ag-andes");
    expect(linked.status).toBe("DRAFT");

    // still ASSIGNED (not live): the owner still can't publish it
    await logout(page);
    await demoLogin(page, /Propietario particular/);
    expect((await apiAs(page, "PATCH", `listings/${id}`, { status: "ACTIVE" })).status).toBe(403);
  });

  test("una agencia no puede crear un encargo en nombre de un propietario", async ({ page }) => {
    await demoLogin(page, /Agente/);
    expect((await create(page, base({ mode: "MANDATE", agencyId: "ag-andes" }))).status).toBe(403);
  });
});

test.describe("2 · Campos por tipo de inmueble", () => {
  test("API: vacacional, comercial y lujo con validación de límites y tipo", async ({ page }) => {
    await demoLogin(page, /Propietario particular/);

    // vacation
    expect((await create(page, base({ listingType: "SHORT_RENT", priceAmount: 90, shortRent: { minNights: 0, maxGuests: 4, cleaningFee: 20 } }))).status).toBe(422);
    expect((await create(page, base({ listingType: "SALE", shortRent: { minNights: 2, maxGuests: 4, cleaningFee: 20 } }))).status).toBe(422);
    const sr = await create(page, base({ listingType: "SHORT_RENT", priceAmount: 90, shortRent: { minNights: 3, maxGuests: 6, cleaningFee: 25 } }));
    expect(sr.status).toBe(201);
    expect(sr.json.shortRent).toEqual({ minNights: 3, maxGuests: 6, cleaningFee: 25 });
    const upd = await apiAs(page, "PATCH", `listings/${sr.json.id}`, { shortRent: { minNights: 2, maxGuests: 5, cleaningFee: 30 } });
    expect(upd.status).toBe(200);
    expect(upd.json.shortRent).toEqual({ minNights: 2, maxGuests: 5, cleaningFee: 30 });
    expect((await apiAs(page, "PATCH", `listings/${sr.json.id}`, { shortRent: { minNights: 2, maxGuests: 99, cleaningFee: 30 } })).status).toBe(422);
    expect((await apiAs(page, "PATCH", `listings/${sr.json.id}`, { commercial: { ceilingHeight: 4, loadingDock: false, zoning: "C-2" } })).status).toBe(422);

    // commercial
    expect((await create(page, base({ listingType: "COMMERCIAL_RENT", kind: "warehouse", beds: 0, priceAmount: 3000, commercial: { ceilingHeight: 1, loadingDock: true, zoning: "I-1" } }))).status).toBe(422);
    const com = await create(page, base({ listingType: "COMMERCIAL_RENT", kind: "warehouse", beds: 0, priceAmount: 3000, commercial: { ceilingHeight: 8.5, loadingDock: true, zoning: `I-1 E2E ${stamp}`, capRate: 7.2 } }));
    expect(com.status).toBe(201);
    expect(com.json.commercial).toMatchObject({ ceilingHeight: 8.5, loadingDock: true, capRate: 7.2 });
    await page.goto(`/en/listing/${com.json.slug}`);
    await expect(page.getByText("8.5 m")).toBeVisible();
    await expect(page.getByText(`I-1 E2E ${stamp}`)).toBeVisible();

    // luxury brochure
    expect((await create(page, base({ brochurePdf: "https://example.com/folleto.pdf" }))).status).toBe(422);
    expect((await create(page, base({ luxury: true, brochurePdf: "no es una url" }))).status).toBe(422);
    const lux = await create(page, base({ luxury: true, kind: "penthouse", priceAmount: 900_000, brochurePdf: "https://example.com/folleto.pdf" }));
    expect(lux.status).toBe(201);
    const got = await apiAs(page, "GET", `listings/${lux.json.id}`);
    expect(got.json.brochurePdf).toBe("https://example.com/folleto.pdf");
  });

  test("wizard (390 px): campos vacacionales con validación, revisión y publicación", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await demoLogin(page, /Propietario particular/);
    await page.goto("/es/owner/new");
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /Publicar yo mismo/ }).click();
    await page.getByRole("button", { name: "Vacacional" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("textbox", { name: "Dirección" }).fill(`Av. Luis Roche, Res. E2E Vac ${stamp}, Altamira`);
    await page.getByRole("option").filter({ hasText: "Altamira" }).first().click();
    await page.getByLabel("Piso / apto / casa").fill("Piso 6, apto 6-B");
    await expect(page.getByText(/Sin duplicados/)).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    // step 3: vacation fields only for SHORT_RENT; commercial fields hidden
    await expect(page.getByLabel("Noches mínimas")).toBeVisible();
    await expect(page.getByLabel("Zonificación")).toHaveCount(0);
    await page.getByLabel("Noches mínimas").fill("0");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Entre 1 y 365 noches/ })).toBeVisible();
    await page.getByLabel("Noches mínimas").fill("3");
    await page.getByLabel("Huéspedes máximos").fill("6");
    await page.getByLabel("Tarifa de limpieza (USD)").fill("25");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click(); // photos (none)
    await page.getByRole("button", { name: "Continuar" }).click(); // price

    // review: deduped address with unit, plural labels, confirmation not pre-checked
    await expect(page.getByTestId("review-address")).toHaveText(`Av. Luis Roche, Res. E2E Vac ${stamp}, Altamira, Piso 6, apto 6-B, Caracas`);
    await expect(page.getByTestId("review-facts")).toContainText("1 puesto");
    await expect(page.getByTestId("review-facts")).not.toContainText("1 puestos");
    await expect(page.getByText(/Mín\. 3 noches · 6 huéspedes/)).toBeVisible();
    const confirm = page.getByRole("checkbox", { name: /Confirmo que soy el propietario/ });
    await expect(confirm).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Publicar ahora" })).toBeDisabled();
    await confirm.check();
    await page.getByRole("button", { name: "Publicar ahora" }).click();
    await expect(page.getByTestId("owner-published")).toBeVisible({ timeout: 30_000 });

    const row = await db.listing.findFirstOrThrow({ where: { address: { contains: `E2E Vac ${stamp}` } } });
    created.push(row.id);
    expect(row.listingType).toBe("SHORT_RENT");
    expect(row.shortRent).toEqual({ minNights: 3, maxGuests: 6, cleaningFee: 25 });
    expect(row.commercial).toBeNull();
  });

  test("editor de la agencia: campos comerciales con validación", async ({ page }) => {
    await demoLogin(page, /Dueño de agencia/);
    const r = await create(page, base({ mode: "AGENCY", listingType: "COMMERCIAL_SALE", kind: "office", beds: 0, priceAmount: 250_000, commercial: { ceilingHeight: 3, loadingDock: false, zoning: "C-3 Comercial" } }));
    expect(r.status).toBe(201);
    await page.goto(`/es/agency/listings/${r.json.id}/edit`);
    await expect(page.getByLabel("Zonificación")).toHaveValue("C-3 Comercial");
    await expect(page.getByLabel("Noches mínimas")).toHaveCount(0);
    await page.getByLabel("Altura libre (m)").fill("1");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /Altura libre entre 2 y 40 m/ })).toBeVisible();
    await page.getByLabel("Altura libre (m)").fill("4.5");
    await page.getByLabel("Zonificación").fill(`C-2 E2E ${stamp}`);
    await page.getByLabel("Tiene andén de carga").check();
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("button", { name: "Guardado" })).toBeVisible();
    const row = await db.listing.findUniqueOrThrow({ where: { id: r.json.id } });
    expect(row.commercial).toEqual({ ceilingHeight: 4.5, loadingDock: true, zoning: `C-2 E2E ${stamp}` });
  });
});
