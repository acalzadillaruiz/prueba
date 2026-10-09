import { expect, type Page } from "@playwright/test";

/** DEMO_AUTH "Entrar como…" (private preview: /login?preview=1) through the real Auth.js demo provider. */
export async function demoLogin(page: Page, label: RegExp) {
  await page.goto("/es/login?preview=1");
  await page.getByRole("button", { name: label }).click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30_000 });
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

export async function apiAs(page: Page, method: string, path: string, data?: unknown) {
  const r = await page.request.fetch(`/api/v1/${path}`, { method, data: data === undefined ? undefined : data, headers: { "content-type": "application/json" } });
  return { status: r.status(), json: await r.json().catch(() => null) };
}

export const expectOk = (status: number) => expect(status, `HTTP ${status}`).toBeLessThan(300);

/** Publish wizard, details step: nothing is pre-filled any more, so the owner writes the basics. */
export async function fillWizardBasics(page: Page, o: { m2?: string; year?: string } = {}) {
  await page.getByLabel(/Superficie (construida|del terreno)/).fill(o.m2 ?? "110");
  await page.getByLabel("Año de construcción").fill(o.year ?? "2005");
}

/** Publish wizard, price step. */
export async function fillWizardPrice(page: Page, price = "150000") {
  await page.getByLabel(/^Tu precio/).fill(price);
}
