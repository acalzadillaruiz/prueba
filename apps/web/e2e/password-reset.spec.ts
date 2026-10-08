import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { expect, test } from "@playwright/test";
import { logout } from "./helpers";

// Password recovery happy path: "¿Olvidaste tu contraseña?" on login → request → link from the email outbox → new
// password → signed in; the link can't be used twice and the new password works on the normal login form.
const db = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/newplace" });
const stamp = Date.now().toString(36);
const email = `e2e-reset-${stamp}@example.com`;
const NEW_PASSWORD = "nuevaClave-2026";

test.describe.serial("Recuperar contraseña", () => {
  test.beforeAll(async () => {
    await db.user.create({ data: { email, name: "Reset E2E", passwordHash: await bcrypt.hash("claveOlvidada-1", 10) } });
  });
  test.afterAll(async () => {
    await db.emailOutbox.deleteMany({ where: { to: email } });
    await db.auditLog.deleteMany({ where: { target: email } });
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  });

  test("pedir enlace → correo → nueva contraseña → entrar", async ({ page }) => {
    await page.goto("/es/login");
    // The email typed on the login form travels with the link and pre-fills the request.
    await page.getByLabel("Email").fill(email);
    await page.getByRole("link", { name: "¿Olvidaste tu contraseña?" }).click();
    await expect(page).toHaveURL(/\/es\/forgot-password\?email=/);
    await expect(page.getByLabel("Email")).toHaveValue(email);
    await page.getByRole("button", { name: "Enviarme el enlace" }).click();
    await expect(page.getByTestId("forgot-sent")).toContainText("Si existe una cuenta");

    const mail = await db.emailOutbox.findFirstOrThrow({ where: { to: email, kind: "RESET" }, orderBy: { createdAt: "desc" } });
    expect(mail.body).toMatch(/^\/es\/reset-password\?token=[A-Za-z0-9_-]{43}$/);
    // Only the hash is stored.
    const token = new URL(mail.body, "http://x").searchParams.get("token")!;
    expect(await db.passwordResetToken.count({ where: { tokenHash: token } })).toBe(0);

    await page.goto(mail.body);
    await page.getByRole("textbox", { name: /^Nueva contraseña/ }).fill(NEW_PASSWORD);
    await page.getByLabel("Repite la contraseña").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Guardar y entrar" }).click();
    await page.waitForURL((u) => !u.pathname.includes("reset-password"), { timeout: 30_000 });
    const me = await page.request.get("/api/v1/me");
    expect((await me.json()).user.email).toBe(email);

    // Single use: the same link now shows the expired state.
    await logout(page);
    await page.goto(mail.body);
    await expect(page.getByRole("heading", { name: "Este enlace ya no sirve" })).toBeVisible();

    // The new password works on the normal login form.
    await page.goto("/es/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30_000 });
  });

  test("un email desconocido recibe la misma respuesta y ningún correo", async ({ page }) => {
    const ghost = `e2e-ghost-${stamp}@example.com`;
    const r = await page.request.post("/api/v1/auth/forgot", { data: { email: ghost } });
    expect(r.status()).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(await db.emailOutbox.count({ where: { to: ghost } })).toBe(0);
  });
});
