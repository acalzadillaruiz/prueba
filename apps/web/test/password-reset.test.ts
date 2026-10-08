import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@newplace/db";

// DB-backed (seeded database): "¿Olvidaste tu contraseña?" end to end through the route handlers. Tokens are hashed,
// single use, time-limited and replaced by a new request; the request endpoint never reveals whether an email exists.
const stamp = `pwr${Date.now().toString(36)}`;
const email = `${stamp}@reset.test`;
const ghost = `${stamp}-nobody@reset.test`;
let userId = "";

const { NextRequest } = await import("next/server");
const forgot = await import("@/app/api/v1/auth/forgot/route");
const resetRoute = await import("@/app/api/v1/auth/reset/route");
const { RESET_TTL_MS, checkPasswordReset, consumePasswordReset, createPasswordReset, hashResetToken } = await import("@/server/password-reset");

const post = (json: unknown) => new NextRequest("http://localhost/api/v1/auth/x", { method: "POST", body: JSON.stringify(json), headers: { "content-type": "application/json" } });
const ask = async (to: string) => {
  const r = await forgot.POST(post({ email: to, locale: "es" }), undefined as never);
  return { status: r.status, json: await r.json() };
};
const doReset = async (token: string, password: string) => {
  const r = await resetRoute.POST(post({ token, password }), undefined as never);
  return { status: r.status, json: await r.json() };
};
/** Token from the latest RESET email in the outbox (what the user would click). */
const tokenFromOutbox = async (to: string) => {
  const row = await prisma.emailOutbox.findFirst({ where: { to, kind: "RESET" }, orderBy: { createdAt: "desc" } });
  return row ? new URL(row.body, "http://x").searchParams.get("token") : null;
};

beforeAll(async () => {
  const u = await prisma.user.create({ data: { email, name: "Reset Test", passwordHash: await bcrypt.hash("viejaClave123", 10) } });
  userId = u.id;
});

afterEach(() => vi.unstubAllEnvs());

afterAll(async () => {
  await prisma.emailOutbox.deleteMany({ where: { to: { contains: stamp } } });
  await prisma.auditLog.deleteMany({ where: { actorId: userId } });
  await prisma.rateLimit.deleteMany({ where: { key: { contains: stamp } } });
  await prisma.user.deleteMany({ where: { id: userId } }); // cascades to PasswordResetToken
});

describe("token storage", () => {
  it("stores only the SHA-256 of a 256-bit random token, valid 30 minutes", async () => {
    const r = await createPasswordReset(email);
    expect(r).not.toBeNull();
    expect(r!.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashResetToken(r!.token)).toBe(createHash("sha256").update(r!.token).digest("hex"));
    const rows = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashResetToken(r!.token));
    expect(rows[0].tokenHash).not.toContain(r!.token);
    expect(Math.abs(rows[0].expiresAt.getTime() - Date.now() - RESET_TTL_MS)).toBeLessThan(5_000);
  });

  it("a new request invalidates the previous link", async () => {
    const a = await createPasswordReset(email);
    const b = await createPasswordReset(email);
    expect(await checkPasswordReset(a!.token)).toBe(false);
    expect(await checkPasswordReset(b!.token)).toBe(true);
    expect(await prisma.passwordResetToken.count({ where: { userId } })).toBe(1);
  });

  it("an expired token is refused", async () => {
    const old = await createPasswordReset(email, Date.now() - RESET_TTL_MS - 1000);
    expect(await checkPasswordReset(old!.token)).toBe(false);
    expect(await consumePasswordReset(old!.token, "nuevaClave456")).toBeNull();
  });

  it("malformed tokens never reach a valid row", async () => {
    expect(await checkPasswordReset("")).toBe(false);
    expect(await checkPasswordReset("x".repeat(43))).toBe(false);
    expect(await consumePasswordReset("../../etc", "nuevaClave456")).toBeNull();
  });
});

describe("POST /auth/forgot — no account enumeration", () => {
  it("answers the same for an existing and an unknown email; only the real account gets a RESET email", async () => {
    const real = await ask(email);
    const fake = await ask(ghost);
    expect(real).toEqual({ status: 200, json: { ok: true } });
    expect(fake).toEqual(real);
    expect(await tokenFromOutbox(email)).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await prisma.emailOutbox.count({ where: { to: ghost } })).toBe(0);
    const mail = await prisma.emailOutbox.findFirstOrThrow({ where: { to: email, kind: "RESET" }, orderBy: { createdAt: "desc" } });
    expect(mail.body).toMatch(/^\/es\/reset-password\?token=/);
    expect(mail.subject).toContain("30 minutos");
  });

  it("per-email budget (3/hour): extra requests still answer 200 but send nothing", async () => {
    vi.stubEnv("RATE_LIMIT", "on");
    const target = `${stamp}-budget@reset.test`;
    const u = await prisma.user.create({ data: { email: target, name: "Budget", passwordHash: "x" } });
    try {
      for (let i = 0; i < 5; i++) expect((await ask(target)).status).toBe(200);
      expect(await prisma.emailOutbox.count({ where: { to: target } })).toBe(3);
    } finally {
      await prisma.user.delete({ where: { id: u.id } });
      await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "pw-forgot:direct" } } });
    }
  });
});

describe("POST /auth/reset", () => {
  it("sets the new password once; the same link can't be used again", async () => {
    await ask(email);
    const token = (await tokenFromOutbox(email))!;
    expect((await doReset(token, "corta")).status).toBe(422); // same rules as sign-up (8+)
    const ok = await doReset(token, "nuevaClave456");
    expect(ok).toEqual({ status: 200, json: { ok: true, email } });
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await bcrypt.compare("nuevaClave456", u.passwordHash!)).toBe(true);
    expect(u.emailVerified).not.toBeNull();
    const again = await doReset(token, "otraClave789");
    expect(again.status).toBe(422);
    expect(again.json.error.details).toEqual({ token: "invalid" });
    expect(await bcrypt.compare("nuevaClave456", (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).passwordHash!)).toBe(true);
  });

  it("an unknown token is refused", async () => {
    expect((await doReset("A".repeat(43), "nuevaClave456")).status).toBe(422);
  });
});
