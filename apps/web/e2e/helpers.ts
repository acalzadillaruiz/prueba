import { expect, type Page } from "@playwright/test";

/** DEMO_AUTH "Entrar como…" through the real Auth.js demo provider. */
export async function demoLogin(page: Page, label: RegExp) {
  await page.goto("/es/login");
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
