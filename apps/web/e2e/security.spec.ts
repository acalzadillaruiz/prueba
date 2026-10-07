import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { apiAs, demoLogin } from "./helpers";

const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

test.describe("Seguridad: hallazgos de auditoría", () => {
  test("capture PATCH: roles y agencia como el GET, DTO mínimo sin datos del propietario", async ({ page }) => {
    const other = await db.captureLead.create({
      data: { agencyId: "ag-night", captorId: "u-agent3", address: `Calle E2E Sec ${Date.now()}`, zone: "Altamira", ownerName: "Dueño Ajeno", phone: "+58 414 000 0000", kind: "apartment", areaM2: 70, askingPrice: 99_000 },
    });
    try {
      // Anonymous → 401; a seeker (not a capture role) → 403.
      expect((await apiAs(page, "PATCH", `capture/${other.id}`, { result: "REJECTED" })).status).toBe(401);
      await demoLogin(page, /Buscador/);
      expect((await apiAs(page, "PATCH", `capture/${other.id}`, { result: "REJECTED" })).status).toBe(403);

      // Captor of Andes Prime: own agency OK with a minimal DTO; another agency's capture → 403.
      await page.context().clearCookies();
      await demoLogin(page, /Captador/);
      const mine = await apiAs(page, "POST", "capture", { address: `Calle E2E Sec propia ${Date.now()}`, zone: "Altamira", ownerName: "Dueña E2E", phone: "+58 414 555 1111", kind: "apartment", areaM2: 61, askingPrice: 101_000, lat: 10.2 + Math.random() * 0.05, lng: -67.4 + Math.random() * 0.05 });
      expect(mine.status).toBe(201);
      try {
        const r = await apiAs(page, "PATCH", `capture/${mine.json.id}`, { result: "REJECTED" });
        expect(r.status).toBe(200);
        expect(r.json).toMatchObject({ id: mine.json.id, result: "REJECTED" });
        expect(r.json).not.toHaveProperty("ownerName");
        expect(r.json).not.toHaveProperty("phone");
        expect(r.json).not.toHaveProperty("fingerprint");
        expect((await apiAs(page, "PATCH", `capture/${other.id}`, { result: "REJECTED" })).status).toBe(403);
        expect((await db.captureLead.findUniqueOrThrow({ where: { id: other.id } })).result).toBe("PENDING");
      } finally {
        await db.captureLead.deleteMany({ where: { id: mine.json.id } });
      }
      // An agent may log captures but not triage them.
      await page.context().clearCookies();
      await demoLogin(page, /Agente/);
      expect((await apiAs(page, "PATCH", `capture/${other.id}`, { result: "REJECTED" })).status).toBe(403);
    } finally {
      await db.captureLead.delete({ where: { id: other.id } });
    }
  });

  test("mandates PATCH: el agente asignado debe ser AGENT de la agencia del encargo; solo gerentes asignan", async ({ page }) => {
    const m = await db.mandate.findFirst({ where: { agencyId: "ag-andes", status: { in: ["REQUESTED", "ASSIGNED"] } } });
    test.skip(!m, "no Andes Prime mandate in the seed");
    const seeker = await db.user.findUniqueOrThrow({ where: { email: "seeker@gmail.com" } });

    await demoLogin(page, /Captador/);
    expect((await apiAs(page, "PATCH", `mandates/${m!.id}`, { agentId: "u-agent2" })).status).toBe(403);

    await page.context().clearCookies();
    await demoLogin(page, /Agente/);
    expect((await apiAs(page, "PATCH", `mandates/${m!.id}`, { agentId: "u-agent2" })).status).toBe(403);

    await page.context().clearCookies();
    await demoLogin(page, /Dueño de agencia/);
    // Agent of another agency, a non-agent user and an unknown id are all rejected.
    for (const agentId of ["u-agent3", seeker.id, "nope"]) {
      const r = await apiAs(page, "PATCH", `mandates/${m!.id}`, { agentId });
      expect(r.status, agentId).toBe(422);
      expect(r.json.error.code).toBe("VALIDATION");
    }
    expect((await db.mandate.findUniqueOrThrow({ where: { id: m!.id } })).agentId).toBe(m!.agentId);
    // A real AGENT of the agency still works (re-assign the current one: idempotent).
    if (m!.agentId) expect((await apiAs(page, "PATCH", `mandates/${m!.id}`, { agentId: m!.agentId })).status).toBe(200);
  });

  test("CSRF: escrituras con Origin de otro host → 403; mismo origen y sin Origin siguen funcionando", async ({ page, baseURL }) => {
    const post = (origin?: string) => page.request.post("/api/v1/leads", { data: { listingId: "x" }, headers: { "content-type": "application/json", ...(origin ? { origin } : {}) } });
    const evil = await post("https://evil.example");
    expect(evil.status()).toBe(403);
    expect((await evil.json()).error.code).toBe("FORBIDDEN");
    expect((await post("null")).status()).toBe(403);
    // Same origin / no Origin reach the handler (validation error, not CSRF).
    expect((await post(new URL(baseURL!).origin)).status()).toBe(422);
    expect((await post()).status()).toBe(422);
    // Safe methods are never blocked.
    expect((await page.request.get("/api/v1/listings/wi3sg7/slots", { headers: { origin: "https://evil.example" } })).status()).toBe(200);
  });

  test("fotos y slots de inmuebles ocultos → 404 salvo para quien puede verlos", async ({ page }) => {
    const pub = await db.listing.findFirstOrThrow({ where: { status: "ACTIVE", review: "APPROVED", privateListing: false }, select: { id: true } });
    const pending = await db.listing.findFirst({ where: { agencyId: "ag-andes", review: "PENDING" }, select: { id: true } });
    // A private DRAFT (never reachable by link); ACTIVE private listings are "solo con enlace" and visible by design.
    const priv = await db.listing.findFirst({ where: { privateListing: true, status: "DRAFT" }, select: { id: true } });
    const hidden = [pending?.id, priv?.id].filter((x): x is string => !!x);
    expect(hidden.length).toBeGreaterThan(0);

    for (const sub of ["photos", "slots"]) {
      expect((await apiAs(page, "GET", `listings/${pub.id}/${sub}`)).status).toBe(200);
      expect((await apiAs(page, "GET", `listings/does-not-exist/${sub}`)).status).toBe(404);
      for (const id of hidden) expect((await apiAs(page, "GET", `listings/${id}/${sub}`)).status, `${sub} ${id}`).toBe(404);
    }
    await demoLogin(page, /Buscador/);
    for (const id of hidden) expect((await apiAs(page, "GET", `listings/${id}/photos`)).status).toBe(404);

    // The agency's owner can still read its hidden listing; ?agent= keeps choosing another agent of the agency.
    if (pending) {
      await page.context().clearCookies();
      await demoLogin(page, /Dueño de agencia/);
      expect((await apiAs(page, "GET", `listings/${pending.id}/photos`)).status).toBe(200);
      const s = await apiAs(page, "GET", `listings/${pending.id}/slots?agent=u-agent2`);
      expect(s.status).toBe(200);
      expect(s.json.agentId).toBe("u-agent2");
    }
  });

  test("leads ?stage= se valida: inválido → 422, válido → 200 filtrado", async ({ page }) => {
    await demoLogin(page, /Dueño de agencia/);
    const bad = await apiAs(page, "GET", "leads?stage=BOGUS");
    expect(bad.status).toBe(422);
    expect(bad.json.error.code).toBe("VALIDATION");
    const good = await apiAs(page, "GET", "leads?stage=NEW");
    expect(good.status).toBe(200);
    expect(good.json.items.every((l: { stage: string }) => l.stage === "NEW")).toBe(true);
    expect((await apiAs(page, "GET", "leads")).status).toBe(200);
  });

  test("demo login solo acepta las cuentas sembradas de DEMO_LOGINS", async ({ page }) => {
    const login = async (email: string) => {
      const { csrfToken } = await (await page.request.get("/api/auth/csrf")).json();
      await page.request.post("/api/auth/callback/demo", { form: { csrfToken, email, json: "true" }, maxRedirects: 0 });
      return (await page.request.get("/api/v1/me")).status();
    };
    // Registered, but not a demo account → no session.
    expect(await login("andres@andesprime.ve")).toBe(401);
    await page.context().clearCookies();
    expect(await login("seeker@gmail.com")).toBe(200);
  });

  test("CSP completa sin violaciones en home, búsqueda (mapa), ficha, login y /agency", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content[- ]Security[- ]Policy|violates the following/i.test(m.text())) violations.push(m.text());
    });
    page.on("pageerror", (e) => {
      if (/Content[- ]Security[- ]Policy|EvalError/i.test(e.message)) violations.push(e.message);
    });
    const listing = await db.listing.findFirstOrThrow({ where: { status: "ACTIVE", review: "APPROVED", privateListing: false }, select: { slug: true } });
    const home = await page.goto("/es");
    const csp = home!.headers()["content-security-policy"];
    for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "img-src 'self' data: blob: https:"]) expect(csp).toContain(d);
    await page.waitForLoadState("networkidle");
    for (const path of ["/es/search?type=SALE", `/es/listing/${listing.slug}`, "/es/login"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
    await demoLogin(page, /Dueño de agencia/);
    await page.goto("/es/agency");
    await page.waitForLoadState("networkidle");
    expect(violations).toEqual([]);
  });
});
