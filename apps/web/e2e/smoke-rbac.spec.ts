import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { apiAs, demoLogin } from "./helpers";

test.describe("Smoke: login, mapa, crear inmueble · RBAC duro", () => {
  test("login con email y contraseña (Credentials)", async ({ page }) => {
    await page.goto("/es/login");
    await page.getByLabel("Email").fill("seeker@gmail.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("NewPlace!2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/\/es\/agency/);
    await expect(page.getByText("Homebuyer Hub")).toBeVisible();
  });

  test("contraseña incorrecta muestra error", async ({ page }) => {
    await page.goto("/es/login");
    await page.getByLabel("Email").fill("seeker@gmail.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta123");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByText(/Email o contraseña incorrectos/)).toBeVisible();
  });

  test("mapa: dibujar polígono filtra resultados", async ({ page }) => {
    await page.goto("/es/search?type=SALE");
    await page.getByRole("button", { name: /Dibujar zona/ }).click();
    const box = (await page.locator('[role="application"]').boundingBox())!;
    for (const [x, y] of [[0.5, 0.25], [0.82, 0.27], [0.84, 0.56], [0.55, 0.62]]) await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
    await page.getByRole("button", { name: /Cerrar zona/ }).click();
    await expect(page.getByText("en tu zona dibujada")).toBeVisible();
  });

  test("RBAC: rutas protegidas y API", async ({ page }) => {
    // anonymous
    expect((await apiAs(page, "GET", "me")).status).toBe(401);
    const r = await page.goto("/es/agency");
    expect(page.url()).toContain("/es/login");
    expect(r?.status()).toBe(200);
    // seeker
    await demoLogin(page, /Buscador/);
    expect((await apiAs(page, "PATCH", "platform/listings/19if9a", { takedown: true })).status).toBe(403);
    expect((await apiAs(page, "PUT", "platform/settings", { aiProvider: "openai-compatible" })).status).toBe(403);
    expect((await apiAs(page, "PATCH", "listings/19if9a", { priceAmount: 1 })).status).toBe(403);
    await page.goto("/es/platform");
    expect(page.url()).not.toContain("/platform");
    // agent cannot edit another agent's listing (19if9a belongs to Valentina → Andrés tries) — use captor instead
    await page.context().clearCookies();
    await demoLogin(page, /Captador/);
    expect((await apiAs(page, "PATCH", "listings/19if9a", { priceAmount: 1 })).status).toBe(403);
    expect((await apiAs(page, "GET", "capture")).status).toBe(200);
    // validation errors are i18n { error: { code, message } }
    const bad = await apiAs(page, "POST", "leads", { listingId: "x" });
    expect(bad.status).toBe(422);
    expect(bad.json.error.code).toBe("VALIDATION");
    expect(bad.json.error.message).toMatch(/Revisa/);
  });

  test("seguridad: no se puede escalar a superadmin vía /api/auth/session ni ver tokens de invitación", async ({ page }) => {
    await demoLogin(page, /Buscador/);
    const { csrfToken } = await (await page.request.get("/api/auth/csrf")).json();
    await page.request.post("/api/auth/session", { data: { csrfToken, data: { agencyId: "ag-night", role: "SUPERADMIN" } } });
    const s = await (await page.request.get("/api/auth/session")).json();
    expect(s.user.role).toBe("SEEKER");
    expect(s.user.agencyId).toBeNull();
    expect((await apiAs(page, "GET", "platform/settings")).status).toBe(403);
    await page.context().clearCookies();
    await demoLogin(page, /Captador/);
    expect((await apiAs(page, "GET", "agency/invitations")).status).toBe(403);
  });

  test("reservas: el mismo horario no se puede reservar dos veces a la vez, ni en el pasado", async ({ page }) => {
    await page.goto("/es");
    const slots = await apiAs(page, "GET", "listings/wi3sg7/slots");
    const free = slots.json.days.flatMap((d: { hours: { iso: string; available: boolean }[] }) => d.hours).filter((h: { available: boolean }) => h.available);
    const iso = free[free.length - 1].iso;
    const lead = (n: number) => ({ listingId: "wi3sg7", name: `Carrera ${n}`, email: `race${n}@test.dev`, message: "Quiero visitar", tourStart: iso });
    const results = await Promise.all([1, 2, 3].map((n) => apiAs(page, "POST", "leads", lead(n))));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    const past = await apiAs(page, "POST", "leads", { ...lead(4), tourStart: new Date(Date.now() - 864e5).toISOString() });
    expect(past.status).toBe(422);
  });

  test("equipo: invitación → registro con el token → entra como miembro; el backoffice no puede degradar al dueño", async ({ page }) => {
    await demoLogin(page, /Dueño de agencia/);
    const email = `invite-${Date.now()}@test.dev`;
    expect((await apiAs(page, "POST", "agency/invitations", { email, role: "CAPTOR" })).status).toBe(201);
    expect((await apiAs(page, "POST", "agency/invitations", { email, role: "AGENT" })).status).toBe(201); // re-invite replaces
    const list = await apiAs(page, "GET", "agency/invitations");
    const mine = list.json.items.filter((i: { email: string }) => i.email === email);
    expect(mine).toHaveLength(1);
    expect(mine[0].token).toBeUndefined();
    // the token only travels by email; read it straight from the database
    const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/newplace" });
    const { token } = await db.invitation.findFirstOrThrow({ where: { email, acceptedAt: null } });
    await db.$disconnect();
    await page.context().clearCookies();
    expect((await apiAs(page, "GET", `invitations/${token}`)).json.agencyName).toBe("Andes Prime");
    expect((await apiAs(page, "POST", "auth/register", { name: "Nueva Agente", email, password: "NewPlace!2026", invite: token })).status).toBe(201);
    expect((await apiAs(page, "POST", "auth/register", { name: "Otra", email: `x${email}`, password: "NewPlace!2026", invite: token })).status).toBe(422);
    await page.goto("/es/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill("NewPlace!2026");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(/\/es\/agency/);
    const me = await apiAs(page, "GET", "me");
    expect(me.json.role ?? me.json.user?.role).toBe("AGENT");
    await page.context().clearCookies();
    await demoLogin(page, /Backoffice/);
    expect((await apiAs(page, "PATCH", "agency/members/u-owner", { role: "AGENT" })).status).toBe(403);
  });

  test("crear inmueble como agencia (queda pendiente de aprobación si lo crea un agente)", async ({ page }) => {
    await demoLogin(page, /Agente/);
    const res = await apiAs(page, "POST", "listings", {
      mode: "AGENCY",
      listingType: "LONG_RENT",
      kind: "apartment",
      address: `Calle E2E ${Date.now()}, La Castellana`,
      zone: "La Castellana",
      city: "Caracas",
      lat: 10.4991 + Math.random() / 1000,
      lng: -66.8581,
      areaM2: 77,
      beds: 2,
      baths: 1,
      parking: 1,
      priceAmount: 900,
    });
    expect(res.status).toBe(201);
    expect(res.json.review).toBe("PENDING");
    expect(res.json.estimate.mid).toBeGreaterThan(0);
    // duplicate is rejected
    const dup = await apiAs(page, "POST", "listings", { mode: "AGENCY", listingType: "SALE", kind: "apartment", address: "Av. San Juan Bosco, Torre Alba, piso 9", zone: "Altamira", city: "Caracas", lat: 10.4962, lng: -66.8503, areaM2: 142, beds: 3, baths: 2, priceAmount: 200000 });
    expect(dup.status).toBe(409);
  });
});
