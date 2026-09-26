// Signs a Playwright browser context in through the real Auth.js "demo" provider (DEMO_AUTH=true).
export const USERS = {
  seeker: "seeker@gmail.com",
  priv: "owner.priv@gmail.com",
  agent: "agent@andesprime.ve",
  owner: "owner@andesprime.ve",
  captor: "rosa@andesprime.ve",
  photo: "miguel@andesprime.ve",
  back: "sofia@andesprime.ve",
  super: "superadmin@newplace.app",
};

export async function login(ctx, base, who) {
  if (!who) return;
  const email = USERS[who] ?? who;
  const { csrfToken } = await (await ctx.request.get(`${base}/api/auth/csrf`)).json();
  const r = await ctx.request.post(`${base}/api/auth/callback/demo`, { form: { csrfToken, email, json: "true" }, maxRedirects: 0 });
  if (r.status() >= 400) throw new Error(`login ${who} failed: HTTP ${r.status()}`);
  const me = await ctx.request.get(`${base}/api/v1/me`);
  if (!me.ok()) throw new Error(`login ${who} failed: /me HTTP ${me.status()}`);
}

/** Walks the owner wizard to step `n` (0-based) for a fresh draft. */
export async function wizardTo(page, n, { photo, address = "Av. San Juan Bosco, Res. Los Samanes, Altamira" } = {}) {
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  if (n === 0) return;
  await page.getByRole("button", { name: /Publicar yo mismo/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  if (n === 1) return;
  await page.getByRole("textbox", { name: "Dirección" }).fill(address);
  await page.getByRole("option").filter({ hasText: "Altamira" }).first().click();
  await page.getByRole("button", { name: "Continuar" }).click();
  if (n === 2) return;
  await page.getByRole("button", { name: "Continuar" }).click();
  if (photo) await page.getByTestId("photo-input").setInputFiles(photo);
  if (n === 3) return;
  await page.getByRole("button", { name: "Continuar" }).click();
  if (n === 4) return;
  await page.getByRole("button", { name: /Redactar con IA/ }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Continuar" }).click();
}

/** Screenshots the largest image on a listing page to use as a realistic upload. */
export async function coverPhoto(browser, base, slug, out) {
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto(`${base}/es/listing/${slug}?shot=1`, { waitUntil: "networkidle" });
  const clip = await p.evaluate(() => {
    const r = [...document.querySelectorAll("main svg, main img")].map((e) => e.getBoundingClientRect()).sort((a, b) => b.width * b.height - a.width * a.height)[0];
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  await p.screenshot({ path: out, type: "jpeg", quality: 85, clip });
  await p.close();
  return out;
}
