import { PrismaClient } from "@prisma/client";
import { expect, request as pwRequest, test, type APIRequestContext } from "@playwright/test";

/**
 * Regression tests for the security review (sept. 2026, 2nd pass). API-only: each actor signs in through the
 * real Auth.js credentials provider in its own request context.
 */
const db = new PrismaClient();
test.afterAll(() => db.$disconnect());

const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3000}`;
const PASSWORD = "NewPlace!2026";

async function as(email: string | null): Promise<APIRequestContext> {
  const ctx = await pwRequest.newContext({ baseURL: BASE });
  if (!email) return ctx;
  const { csrfToken } = await (await ctx.get("/api/auth/csrf")).json();
  await ctx.post("/api/auth/callback/credentials", { form: { csrfToken, email, password: PASSWORD, json: "true" }, maxRedirects: 0 });
  expect((await ctx.get("/api/v1/me")).status(), `login ${email}`).toBe(200);
  return ctx;
}

/** Smallest valid PNG (1×1). */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

test.describe("Seguridad: revisión 2", () => {
  test("un agente de otra agencia no abre un lead aunque su id figure como agente", async () => {
    const lead = await db.lead.create({
      data: { listingId: "12vqhy", agencyId: "ag-andes", agentId: "u-agent3", name: "Comprador Sec", email: `sec.review.${Date.now()}@example.com`, message: "PII del comprador", source: "LISTING_FORM" },
    });
    const night = await as("carolina@caracasnight.ve");
    const andes = await as("owner@andesprime.ve");
    try {
      const r = await night.get(`/api/v1/leads/${lead.id}`);
      expect(r.status()).toBe(403);
      expect(await r.text()).not.toContain("PII del comprador");
      expect((await night.post(`/api/v1/leads/${lead.id}/messages`, { data: { body: "hola" } })).status()).toBe(403);
      expect((await night.post("/api/v1/ai/lead-score", { data: { leadId: lead.id } })).status()).toBe(403);
      expect((await andes.get(`/api/v1/leads/${lead.id}`)).status()).toBe(200);
    } finally {
      await db.leadEvent.deleteMany({ where: { leadId: lead.id } });
      await db.lead.delete({ where: { id: lead.id } });
      await night.dispose();
      await andes.dispose();
    }
  });

  test("fotos: tope por subida y al borrar una foto deja de servirse", async () => {
    const priv = await as("owner.priv@gmail.com");
    const listingId = "kqixj0"; // FSBO of owner.priv
    const before = await db.listingPhoto.findMany({ where: { listingId }, select: { id: true } });
    try {
      const many = new FormData();
      for (let i = 0; i < 21; i++) many.append("files", new Blob([PNG], { type: "image/png" }), `p${i}.png`);
      expect((await priv.post(`/api/v1/listings/${listingId}/photos`, { multipart: many })).status()).toBe(422);
      expect(await db.listingPhoto.count({ where: { listingId } })).toBe(before.length);

      const one = new FormData();
      one.append("files", new Blob([PNG], { type: "image/png" }), "p.png");
      const up = await priv.post(`/api/v1/listings/${listingId}/photos`, { multipart: one });
      expect(up.status()).toBe(201);
      const photo = (await up.json()).photos[0] as { id: string; url: string };
      expect((await priv.get(photo.url)).status()).toBe(200);
      const rm = await priv.patch(`/api/v1/listings/${listingId}/photos`, { data: { remove: photo.id } });
      expect(rm.status()).toBe(200);
      expect((await priv.get(photo.url)).status()).toBe(404);
    } finally {
      await db.listingPhoto.deleteMany({ where: { listingId, id: { notIn: before.map((p) => p.id) } } });
      await priv.dispose();
    }
  });

  test("/uploads no sale del directorio de subidas", async () => {
    const anon = await as(null);
    for (const p of ["/uploads/..%2F..%2Fpackage.json", "/uploads/..%2f..%2fapps%2fweb%2f.env.local", "/uploads/listings/..%2F..%2F..%2Fdocs%2FREVIEW.md", "/uploads/%2Fetc%2Fpasswd"]) {
      const r = await anon.get(p);
      expect(r.status(), p).not.toBe(200);
      const t = await r.text();
      expect(t).not.toContain("DATABASE_URL");
      expect(t).not.toContain('"workspaces"');
    }
    await anon.dispose();
  });

  test("entradas acotadas en IA pública y secreto del cron", async () => {
    const anon = await as(null);
    const big = await anon.post("/api/v1/ai/estimate", { data: { zone: "Altamira", areaM2: 100, amenities: Array.from({ length: 5000 }, (_, i) => `a${i}`) } });
    expect(big.status()).toBe(422);
    expect((await anon.post("/api/v1/ai/estimate", { data: { zone: "x".repeat(5000), areaM2: 100 } })).status()).toBe(422);
    expect((await anon.post("/api/v1/ai/estimate", { data: { zone: "Altamira", areaM2: 100 } })).status()).toBe(200);
    expect((await anon.post("/api/v1/alerts/run", { headers: { authorization: "Bearer wrong" } })).status()).toBe(403);
    await anon.dispose();
  });

  test("las vistas solo cuentan en fichas publicadas", async () => {
    const anon = await as(null);
    const pending = "1352ue"; // ACTIVE but review PENDING: no public page
    const v0 = (await db.listing.findUniqueOrThrow({ where: { id: pending }, select: { views: true } })).views;
    expect((await anon.post(`/api/v1/listings/${pending}/view`)).status()).toBe(204);
    expect((await db.listing.findUniqueOrThrow({ where: { id: pending }, select: { views: true } })).views).toBe(v0);
    await anon.dispose();
  });

  test("login: una sesión nunca eleva rol ni cambia de agencia desde el cliente", async () => {
    const agent = await as("carolina@caracasnight.ve");
    const { csrfToken } = await (await agent.get("/api/auth/csrf")).json();
    await agent.post("/api/auth/session", { data: { csrfToken, data: { role: "SUPERADMIN", agencyId: "ag-andes" }, role: "SUPERADMIN", agencyId: "ag-andes" } });
    const s = await (await agent.get("/api/v1/me/session")).json();
    expect(s.user).toMatchObject({ role: "AGENT", agencyId: "ag-night" });
    expect((await agent.get("/api/v1/platform/audit")).status()).toBe(403);
    await agent.dispose();
  });
});
