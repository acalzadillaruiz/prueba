// Records narrated walkthrough videos (Playwright → webm → mp4). Needs DEMO_AUTH=true and a fresh `npm run db:seed`.
// Usage: BASE=http://localhost:3001 node scripts/video.mjs cliente|admin|propietario
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { coverPhoto, login } from "./auth.mjs";

const BASE = process.env.BASE ?? "http://localhost:3001";
const which = process.argv[2] ?? "cliente";
const OUT = new URL("../videos/", import.meta.url).pathname;
const TMP = OUT + "tmp-" + which + "/";
mkdirSync(TMP, { recursive: true });
const FFMPEG = process.env.FFMPEG ?? execFileSync("python3", ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();

const SIZE = { width: 1440, height: 900 };
const browser = await chromium.launch();
const PHOTO = await coverPhoto(browser, BASE, "los-palos-grandes-3h-118m-l5u136", TMP + "upload.jpg");
const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir: TMP, size: SIZE } });
if (which === "cliente") await login(ctx, BASE, "seeker");

// Overlay: visible cursor + caption bar (injected on every page).
await ctx.addInitScript(() => {
  const boot = () => {
    if (document.getElementById("np-cursor")) return;
    const c = document.createElement("div");
    c.id = "np-cursor";
    c.style.cssText = "position:fixed;z-index:2147483647;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(242,107,77,.35);border:2px solid #F26B4D;pointer-events:none;transition:transform 120ms ease-out;box-shadow:0 0 0 4px rgba(247,244,239,.35)";
    const cx = sessionStorage.getItem("np-cx");
    if (cx) { const [x, y] = cx.split(","); c.style.left = x + "px"; c.style.top = y + "px"; }
    document.body.appendChild(c);
    const cap = document.createElement("div");
    cap.id = "np-caption";
    cap.style.cssText = "position:fixed;z-index:2147483646;left:50%;bottom:26px;transform:translateX(-50%);max-width:1000px;padding:12px 22px;border-radius:14px;background:rgba(11,18,32,.92);color:#F7F4EF;font:600 19px/1.35 Outfit,system-ui;letter-spacing:-.01em;box-shadow:0 12px 40px rgba(0,0,0,.35);border:1px solid rgba(242,107,77,.5);pointer-events:none;opacity:0;transition:opacity 200ms";
    cap.textContent = sessionStorage.getItem("np-cap") ?? "";
    if (cap.textContent) cap.style.opacity = "1";
    document.body.appendChild(cap);
    document.querySelector("[data-demobar]")?.setAttribute("style", "");
    window.addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; sessionStorage.setItem("np-cx", e.clientX + "," + e.clientY); }, true);
    window.addEventListener("mousedown", () => { c.style.transform = "scale(.7)"; }, true);
    window.addEventListener("mouseup", () => { c.style.transform = "scale(1)"; }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
});

const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);
async function caption(text, ms = 0) {
  await page.evaluate((t) => {
    sessionStorage.setItem("np-cap", t);
    const el = document.getElementById("np-caption");
    if (el) { el.textContent = t; el.style.opacity = t ? "1" : "0"; }
  }, text);
  if (ms) await wait(ms);
}
async function go(path, ms = 1200) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await wait(ms);
}
async function moveTo(loc, opts = {}) {
  await loc.scrollIntoViewIfNeeded();
  const b = await loc.boundingBox();
  if (!b) return;
  await page.mouse.move(b.x + b.width * (opts.fx ?? 0.5), b.y + b.height * (opts.fy ?? 0.5), { steps: 22 });
  await wait(opts.pause ?? 250);
}
async function click(loc, opts = {}) {
  await moveTo(loc, opts);
  await page.mouse.down();
  await wait(90);
  await page.mouse.up();
  await loc.click({ force: true, trial: true }).catch(() => {});
  await wait(opts.after ?? 700);
}
async function realClick(loc, opts = {}) {
  await moveTo(loc, opts);
  await loc.click();
  await wait(opts.after ?? 800);
}
async function type(loc, text, delay = 55) {
  await realClick(loc, { after: 200 });
  await loc.pressSequentially(text, { delay });
  await wait(400);
}
async function scrollBy(y, steps = 12) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, y / steps);
    await wait(40);
  }
  await wait(600);
}
async function demoLogin(label, expectPath) {
  await realClick(page.locator("[data-demobar] > button"), { after: 500 });
  await realClick(page.locator("[data-demobar] button", { hasText: label }).first(), { after: 300 });
  await page.waitForURL((u) => u.pathname.includes(expectPath), { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await wait(1200);
}

const LPG = "/es/listing/los-palos-grandes-3h-118m-l5u136";
const freeSlot = () => page.locator("button:not([disabled])", { hasText: /^\d\d:00$/ });

async function cliente() {
  await go("/es", 600);
  await caption("New Place · Perfil cliente (buscador). Home con mapa night centrado en Caracas.", 2600);
  await moveTo(page.locator("h1"), { pause: 600 });
  await caption("Pines con precio agrupados en clusters. Clic en un pin → vista previa.");
  const map = page.locator('svg[role="application"]').first();
  await click(page.getByRole("button", { name: "Zoom in" }).first(), { after: 600 });
  const pin = map.locator("g.cursor-pointer:not(:has(circle))").nth(3);
  await realClick(pin, { after: 1800 });
  await caption("Búsqueda en lenguaje natural con IA (funciona sin API key).", 800);
  await type(page.getByRole("textbox", { name: "Buscar" }), "ático con luz en Los Palos Grandes por menos de 180 mil", 45);
  await realClick(page.getByRole("button", { name: /Buscar/ }).last(), { after: 2200 });
  await caption("La IA convirtió la frase en filtros: zona, precio máximo y tipo «ático».", 3000);
  await caption("Filtro del criterio de aceptación: Comprar · 2+ hab · < 250.000 USD · Chacao.");
  await go("/es/search?type=SALE", 1000);
  await realClick(page.getByLabel("Precio máximo", { exact: true }), { after: 200 });
  await page.getByLabel("Precio máximo", { exact: true }).selectOption("250000");
  await wait(900);
  await page.getByLabel("Habitaciones", { exact: true }).selectOption("2");
  await wait(900);
  await moveTo(page.getByLabel("Zona", { exact: true }));
  await page.getByLabel("Zona", { exact: true }).selectOption("Chacao");
  await wait(2200);
  await caption("Mapa 60 % + lista 40 %. También se puede dibujar un área en el mapa.");
  await go("/es/search?type=SALE", 1200);
  await realClick(page.getByRole("button", { name: /Dibujar zona/ }), { after: 400 });
  const mapBox = await page.locator('svg[role="application"]').boundingBox();
  for (const [x, y] of [[0.5, 0.25], [0.82, 0.27], [0.84, 0.56], [0.55, 0.62]]) {
    await page.mouse.move(mapBox.x + mapBox.width * x, mapBox.y + mapBox.height * y, { steps: 18 });
    await page.mouse.click(mapBox.x + mapBox.width * x, mapBox.y + mapBox.height * y);
    await wait(350);
  }
  await realClick(page.getByRole("button", { name: /Cerrar zona/ }), { after: 2400 });
  await caption("Abrimos la ficha del ático en Los Palos Grandes.");
  await go(LPG, 1500);
  await caption("Ficha bilingüe: galería, plano, video, tour 360° y vista de calle.", 1500);
  await realClick(page.locator("main button").first(), { after: 1000 });
  for (let i = 0; i < 3; i++) await realClick(page.locator('[role="dialog"] button:has(svg.lucide-chevron-right)'), { after: 700 });
  await realClick(page.locator('[role="dialog"] button', { hasText: "Plano" }), { after: 1500 });
  await page.keyboard.press("Escape"); // Escape closes the lightbox
  await wait(800);
  await caption("PlaceEstimate: valor estimado, rango, confianza y los comparables usados.");
  await scrollBy(900, 14);
  await wait(2500);
  await caption("Mapa de ubicación, historial de precio e informe de zona.");
  await scrollBy(700, 12);
  await wait(2200);
  await scrollBy(600, 10);
  await wait(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(1200);
  await caption("Pedir visita con los horarios reales de la agenda del agente.");
  await realClick(freeSlot().nth(1), { after: 500 });
  await realClick(page.getByRole("button", { name: /Solicitar visita/ }), { after: 2600 });
  await caption("Lead creado: el agente lo recibe al instante con score de IA.", 1800);
  await caption("Guardar y comparar (hasta 3 inmuebles).");
  await go("/es/saved", 1200);
  const cmp = page.getByRole("button", { name: /^Comparar$/ });
  for (let i = 0; i < 3; i++) await realClick(cmp.nth(i === 0 ? 0 : 0), { after: 600 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await wait(2800);
  await scrollBy(500, 10);
  await wait(1500);
  await caption("Homebuyer Hub: pasos, visitas, precalificación simulada y alertas.");
  await go("/es/app", 2200);
  const range = page.locator('input[type="range"]').first();
  await moveTo(range, { fx: 0.3 });
  await page.mouse.down();
  await page.mouse.move((await range.boundingBox()).x + (await range.boundingBox()).width * 0.55, (await range.boundingBox()).y + 6, { steps: 20 });
  await page.mouse.up();
  await wait(1500);
  await caption("Alertas de búsqueda y correos enviados (email_outbox).");
  await go("/es/alerts", 2500);
  await caption("Todo es bilingüe: /es ↔ /en sin romper rutas.");
  await realClick(page.getByRole("link", { name: "English" }), { after: 2500 });
  await go("/en" + LPG.slice(3), 2500);
  await caption("Fin del recorrido del cliente · New Place — Un nuevo lugar.", 2500);
}

async function admin() {
  await go(LPG, 800);
  await caption("Perfil admin. Primero, un cliente pide visita desde la ficha…", 1500);
  await realClick(freeSlot().nth(2), { after: 400 });
  await type(page.getByRole("textbox", { name: "Nombre" }), "Mariana Suárez", 35);
  await type(page.getByRole("textbox", { name: "Email" }), "mariana.s@gmail.com", 30);
  await realClick(page.getByRole("button", { name: /Solicitar visita/ }), { after: 2200 });
  await caption("Entramos como agente (modo demo «Entrar como…»).");
  await demoLogin("Agente", "/agency/leads");
  await caption("Bandeja de leads: SLA de 15 min, score IA 0-100 y siguiente mejor acción.", 2500);
  await realClick(page.locator("main button", { hasText: "Gabriela Torres" }).first(), { after: 1500 });
  await moveTo(page.getByText(/Score IA/), { pause: 1800 });
  await caption("Un clic en la acción sugerida: propone la visita y mueve el lead de etapa.");
  await realClick(page.getByRole("button", { name: /Proponer visita/ }).first(), { after: 2400 });
  await caption("Calendario con las visitas y los slots que ve el comprador.");
  await realClick(page.getByRole("link", { name: /Calendario/ }).first(), { after: 2500 });
  await realClick(page.getByRole("button", { name: "14h" }).first(), { after: 1200 });
  await caption("Edición del inmueble: calidad de ficha, PlaceEstimate con comparables y comisión.");
  await go("/es/agency/listings/l5u136/edit", 2000);
  await realClick(page.getByRole("button", { name: /Redactar con IA/ }), { after: 1600 });
  await realClick(page.getByRole("button", { name: "EN" }).first(), { after: 1500 });
  await scrollBy(600, 10);
  await wait(1500);
  await caption("Ahora como dueño de la agencia.");
  await demoLogin("Dueño de agencia", "/agency");
  await caption("Panel: inmuebles activos, leads 7 días, conversión, tiempo a visita y ranking.", 2500);
  await moveTo(page.locator("svg rect").nth(20), { pause: 1200 });
  await scrollBy(700, 12);
  await wait(2200);
  await scrollBy(500, 10);
  await wait(1500);
  await caption("Inmuebles: aprobación de publicaciones, calidad y asignación de agente.");
  await realClick(page.getByRole("link", { name: /Inmuebles/ }).first(), { after: 1500 });
  await realClick(page.getByRole("button", { name: /Por aprobar/ }), { after: 1000 });
  await realClick(page.getByRole("button", { name: /Aprobar/ }).first(), { after: 1500 });
  await caption("Captación con detección de duplicados (fingerprint lat/lng + m² + dirección).");
  await realClick(page.getByRole("link", { name: /Captación/ }).first(), { after: 2500 });
  const addr = page.locator("input").nth(1);
  await realClick(addr, { after: 200 });
  await addr.fill("");
  await addr.pressSequentially("Calle Los Jabillos, Qta. Aurora", { delay: 40 });
  await wait(1800);
  await caption("Equipo, informes con exportación CSV y ajustes de marca y comisión.");
  await realClick(page.getByRole("link", { name: /Equipo/ }).first(), { after: 1800 });
  await realClick(page.getByRole("link", { name: /Informes/ }).first(), { after: 1800 });
  await realClick(page.getByRole("link", { name: /Ajustes/ }).first(), { after: 1800 });
  await caption("Por último, el superadmin de la plataforma.");
  await demoLogin("Superadmin", "/platform");
  await caption("Métricas globales, salud del sistema y registro de auditoría.", 2500);
  await scrollBy(600, 10);
  await wait(1200);
  await caption("Agencias: plan (sin cobro), verificación e impersonar.");
  await realClick(page.getByRole("link", { name: /^Agencias/ }).first(), { after: 1200 });
  await realClick(page.getByRole("button", { name: /Impersonar/ }).first(), { after: 1800 });
  await caption("Moderación: apagamos un anuncio de Chacao…");
  await realClick(page.getByRole("link", { name: /Moderación/ }).first(), { after: 1200 });
  await realClick(page.locator('[data-listing="19if9a"]').getByRole("button", { name: /Apagar/ }), { after: 1800 });
  await caption("…y desaparece de la búsqueda pública (ahora 2 resultados en Chacao).");
  await go("/es/search?type=SALE&zone=Chacao&beds=2&max=250000", 2800);
  await caption("Cambio de proveedor de IA en caliente y tasas FX de referencia.");
  await go("/es/platform/ai", 1200);
  await realClick(page.getByRole("button", { name: /OpenAICompatibleProvider/ }), { after: 1800 });
  await realClick(page.getByRole("button", { name: /HeuristicProvider/ }), { after: 800 });
  await caption("Fin del recorrido admin · New Place — Un nuevo lugar.", 2500);
}

async function propietario() {
  await go("/es", 600);
  await caption("Entramos como propietaria particular (Isabel).");
  await demoLogin("Propietario particular", "/owner/listings");
  await go("/es/owner/new", 600);
  await caption("Propietario particular: publicar FSBO en Altamira en 6 pasos.", 2200);
  await page.evaluate(() => sessionStorage.removeItem("np-owner-draft-v1"));
  await go("/es/owner/new", 600);
  await realClick(page.getByRole("button", { name: /Publicar yo mismo/ }), { after: 500 });
  await realClick(page.getByRole("button", { name: /Continuar/ }));
  await type(page.getByRole("textbox", { name: "Dirección" }), "Av. San Juan Bosco, Res. Los Samanes", 45);
  await realClick(page.getByRole("option").filter({ hasText: "Altamira" }).first(), { after: 1800 });
  await realClick(page.getByRole("button", { name: /Continuar/ }));
  await caption("Características y amenidades.");
  await realClick(page.getByRole("button", { name: /\+$/ }).first(), { after: 500 });
  await realClick(page.getByRole("button", { name: /Piscina/ }), { after: 800 });
  await realClick(page.getByRole("button", { name: /Continuar/ }));
  await caption("Fotos: subida, orden y portada.");
  await moveTo(page.getByText(/Arrastra tus fotos/), { pause: 400 });
  await page.getByTestId("photo-input").setInputFiles(PHOTO);
  await wait(1800);
  await realClick(page.getByRole("button", { name: /Continuar/ }));
  await caption("PlaceEstimate en vivo y «Redactar con IA» en español e inglés.", 1500);
  await realClick(page.getByRole("button", { name: /Redactar con IA/ }), { after: 1800 });
  await realClick(page.getByRole("button", { name: "EN" }).first(), { after: 1500 });
  await realClick(page.getByRole("button", { name: /Continuar/ }));
  await caption("Revisión: calidad de ficha y publicar.", 1800);
  await realClick(page.getByRole("button", { name: /Publicar ahora/ }), { after: 600 });
  await page.getByTestId("owner-published").waitFor({ timeout: 30000 });
  await wait(2200);
  await caption("Mis inmuebles: estado del encargo, ofertas recibidas y chat con el agente.");
  await go("/es/owner/listings", 2500);
  await scrollBy(700, 12);
  await wait(1500);
  const chat = page.getByPlaceholder(/Escribe un mensaje/);
  await type(chat, "Perfecto, revisemos la oferta mañana a las 10.", 40);
  await page.keyboard.press("Enter");
  await wait(2000);
  await caption("Fin · New Place — Un nuevo lugar.", 2000);
}

try {
  if (which === "cliente") await cliente();
  else if (which === "admin") await admin();
  else await propietario();
} catch (e) {
  console.error("step failed:", e.message);
}
await caption("", 300);
await ctx.close();
await browser.close();

rmSync(PHOTO, { force: true });
const webm = readdirSync(TMP).find((f) => f.endsWith(".webm"));
const src = TMP + webm;
const dst = OUT + `new-place-${which}.mp4`;
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", src, "-c:v", "libx264", "-preset", "medium", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst]);
renameSync(src, OUT + `new-place-${which}.webm`);
rmSync(TMP, { recursive: true, force: true });
console.log("saved", dst);
