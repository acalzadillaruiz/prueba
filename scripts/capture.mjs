// Captures every view (desktop + mobile) into /captures as JPEG + captures/index.json.
// Needs a running app with DEMO_AUTH=true and a freshly seeded DB (`npm run db:seed`).
// Usage: BASE=http://localhost:3001 node scripts/capture.mjs [filter]
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { login, wizardTo } from "./auth.mjs";

const BASE = process.env.BASE ?? "http://localhost:3001";
const OUT = new URL("../captures/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const only = process.argv[2];

const LPG = "los-palos-grandes-3h-118m-l5u136";
const PHOTO = OUT + ".upload.jpg";

async function clickPin(page) {
  await page.evaluate(() => {
    const pins = [...document.querySelectorAll("svg g.cursor-pointer")].filter((g) => g.querySelector("rect") && !g.querySelector("circle"));
    const pick = pins[Math.min(2, pins.length - 1)];
    pick?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

async function drawPolygon(page) {
  await page.getByRole("button", { name: /Dibujar zona|Draw area/ }).click();
  const box = await page.locator('svg[role="application"]').boundingBox();
  const pts = [[0.52, 0.28], [0.8, 0.3], [0.82, 0.55], [0.55, 0.6]];
  for (const [x, y] of pts) {
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
    await page.waitForTimeout(150);
  }
  await page.getByRole("button", { name: /Cerrar zona|Close area/ }).click();
}

const SHOTS = [
  // ── Público
  { id: "01-home", section: "Público", title: "Home · mapa night de Caracas y búsqueda con IA", path: "/es", full: true },
  { id: "02-home-en", section: "Público", title: "Home en inglés (/en)", path: "/en" },
  { id: "03-search", section: "Público", title: "Búsqueda mapa 60 % + lista 40 %", path: "/es/search?type=SALE" },
  { id: "04-search-chacao", section: "Público", title: "Filtro: comprar · 2+ hab · < 250.000 USD · Chacao", path: "/es/search?type=SALE&zone=Chacao&beds=2&max=250000" },
  { id: "05-search-nl", section: "Público", title: "Búsqueda en lenguaje natural: «ático con luz en Los Palos Grandes por menos de 180 mil»", path: "/es/search?type=SALE&zone=Los+Palos+Grandes&max=180000&kind=penthouse&q=%C3%A1tico+con+luz+en+Los+Palos+Grandes+por+menos+de+180+mil" },
  { id: "06-search-polygon", section: "Público", title: "Dibujar zona en el mapa (polígono)", path: "/es/search?type=SALE", act: drawPolygon },
  { id: "07-search-filters", section: "Público", title: "Más filtros: publicado, amoblado, mascotas, agencia verificada, amenidades", path: "/es/search?type=LONG_RENT", act: async (p) => p.getByRole("button", { name: /Más filtros/ }).click() },
  { id: "08-search-pin", section: "Público", title: "Clic en un pin → tarjeta de vista previa", path: "/es/search?type=SALE", act: async (p) => { await p.getByRole("button", { name: "Zoom in" }).click(); await p.waitForTimeout(300); await clickPin(p); } },
  { id: "09-listing", section: "Público", title: "Ficha: galería, PlaceEstimate + comparables, mapa, historial de precio, zona", path: `/es/listing/${LPG}`, full: true },
  { id: "10-listing-gallery", section: "Público", title: "Galería a pantalla completa (fotos, plano, video, tour 360°, calle)", path: `/es/listing/${LPG}`, act: async (p) => p.locator("main button").first().click() },
  { id: "11-listing-plan", section: "Público", title: "Plano del inmueble", path: `/es/listing/${LPG}`, act: async (p) => { await p.getByRole("button", { name: /Plano/ }).first().click(); } },
  { id: "12-tour-requested", section: "Público", title: "Visita solicitada → lead creado para el agente", path: `/es/listing/${LPG}`, act: async (p) => { await p.getByRole("button", { name: /Solicitar visita/ }).click(); await p.evaluate(() => window.scrollTo(0, 250)); } },
  { id: "13-listing-luxury", section: "Público", title: "Ficha Luxury (galería full-bleed, marco gold)", path: "/es/listing/lomas-de-san-roman-6h-850m-eoaur5", full: true },
  { id: "14-luxury", section: "Público", title: "Colección Luxury", path: "/es/luxury", full: true },
  { id: "15-listing-vacation", section: "Público", title: "Ficha vacacional (Lechería)", path: "/es/listing/lecheria-2h-85m-fyhrjd" },
  { id: "16-listing-commercial", section: "Público", title: "Ficha comercial (galpón, altura libre, zonificación)", path: "/es/listing/la-trinidad-warehouse-900m-haz6bp" },
  { id: "17-saved-compare", section: "Público", title: "Guardados + comparador (máx. 3)", path: "/es/saved", full: true, compare: ["l5u136", "1pdomx", "9jppm1"] },
  { id: "18-alerts", section: "Público", title: "Alertas de búsqueda + bandeja «Enviados» (email_outbox)", path: "/es/alerts" },
  { id: "19-login", section: "Público", title: "Login: Google + email · modo demo «Entrar como…»", path: "/es/login", as: null },
  { id: "20-register", section: "Público", title: "Registro con flujo «¿Eres agencia?»", path: "/es/register", as: null, act: async (p) => p.getByText(/¿Eres agencia\?/).click() },
  { id: "21-account", section: "Público", title: "Perfil del buscador", path: "/es/account" },
  { id: "22-hub", section: "Público", title: "Homebuyer Hub: pasos, visitas, precalificación simulada", path: "/es/app", full: true },
  // ── Propietario
  { id: "23-owner-step1", section: "Propietario particular", title: "Asistente 1/6 · FSBO o encargo a agencia", path: "/es/owner/new", as: "priv", act: (p) => wizardTo(p, 0) },
  { id: "24-owner-step2", section: "Propietario particular", title: "Asistente 2/6 · dirección con autocompletado (Places) y anti-duplicados", path: "/es/owner/new", as: "priv", act: async (p) => { await wizardTo(p, 1); await p.getByRole("textbox", { name: "Dirección" }).fill("San Juan Bosco"); await p.waitForTimeout(400); } },
  { id: "25-owner-step3", section: "Propietario particular", title: "Asistente 3/6 · características", path: "/es/owner/new", as: "priv", act: (p) => wizardTo(p, 2) },
  { id: "26-owner-step4", section: "Propietario particular", title: "Asistente 4/6 · fotos, orden y portada", path: "/es/owner/new", as: "priv", act: (p) => wizardTo(p, 3, { photo: PHOTO }) },
  { id: "27-owner-step5", section: "Propietario particular", title: "Asistente 5/6 · PlaceEstimate en vivo + «Redactar con IA»", path: "/es/owner/new", as: "priv", act: async (p) => { await wizardTo(p, 4, { photo: PHOTO }); await p.getByRole("button", { name: /Redactar con IA/ }).click(); await p.waitForTimeout(1200); } },
  { id: "28-owner-step6", section: "Propietario particular", title: "Asistente 6/6 · revisión y calidad de ficha", path: "/es/owner/new", as: "priv", act: (p) => wizardTo(p, 5, { photo: PHOTO }) },
  { id: "29-owner-published", section: "Propietario particular", title: "Publicado en Altamira", path: "/es/owner/new", as: "priv", act: async (p) => { await wizardTo(p, 5, { photo: PHOTO, address: "Av. San Juan Bosco, Res. Capturas, Altamira" }); await p.getByRole("button", { name: /Publicar ahora/ }).click(); await p.getByTestId("owner-published").waitFor({ timeout: 30000 }); } },
  { id: "30-owner-listings", section: "Propietario particular", title: "Mis inmuebles: estado del encargo, ofertas y chat con el agente", path: "/es/owner/listings", full: true, as: "priv" },
  // ── Agencia
  { id: "31-agency-dashboard", section: "Agencia", title: "Panel del dueño de agencia", path: "/es/agency", full: true, as: "owner" },
  { id: "32-agency-leads", section: "Agencia", title: "Leads: SLA 15 min, score IA y siguiente mejor acción", path: "/es/agency/leads", as: "agent" },
  { id: "33-agency-listings", section: "Agencia", title: "Inmuebles: estados, aprobación, calidad y asignación de agente", path: "/es/agency/listings", as: "back" },
  { id: "34-agency-edit", section: "Agencia", title: "Editar inmueble: PlaceEstimate + comparables, calidad, comisión", path: "/es/agency/listings/l5u136/edit", full: true, as: "agent" },
  { id: "35-agency-calendar", section: "Agencia", title: "Calendario de visitas y slots del agente", path: "/es/agency/calendar", as: "agent" },
  { id: "36-agency-team", section: "Agencia", title: "Equipo, roles, verificación e invitaciones", path: "/es/agency/team", as: "owner" },
  { id: "37-agency-reports", section: "Agencia", title: "Informes y exportación CSV", path: "/es/agency/reports", as: "owner" },
  { id: "38-agency-capture", section: "Agencia", title: "Captador: cola y detección de duplicados", path: "/es/agency/capture", as: "captor" },
  { id: "39-agency-media", section: "Agencia", title: "Fotógrafo: trabajos, checklist y subida masiva", path: "/es/agency/media", as: "photo" },
  { id: "40-agency-settings", section: "Agencia", title: "Marca de agencia y reglas de comisión", path: "/es/agency/settings", as: "owner" },
  // ── Superadmin
  { id: "41-platform", section: "Superadmin", title: "Métricas globales, salud del sistema y auditoría", path: "/es/platform", full: true, as: "super" },
  { id: "42-platform-agencies", section: "Superadmin", title: "Agencias: plan (sin cobro), verificación e impersonar", path: "/es/platform/agencies", as: "super", act: async (p) => p.getByRole("button", { name: /Impersonar/ }).first().click() },
  { id: "43-platform-users", section: "Superadmin", title: "Usuarios", path: "/es/platform/users", as: "super" },
  { id: "44-platform-moderation", section: "Superadmin", title: "Moderación: reportes y apagar un anuncio", path: "/es/platform/moderation", as: "super" },
  { id: "45-platform-ai", section: "Superadmin", title: "Cambio de proveedor IA, tasas FX y herramientas de seed", path: "/es/platform/ai", as: "super" },
  // ── Móvil
  { id: "m1-home", section: "Móvil (PWA)", title: "Home móvil", path: "/es", mobile: true, as: null },
  { id: "m2-search-map", section: "Móvil (PWA)", title: "Búsqueda móvil: mapa a pantalla completa", path: "/es/search?type=SALE", mobile: true },
  { id: "m3-search-list", section: "Móvil (PWA)", title: "Búsqueda móvil: lista", path: "/es/search?type=SALE", mobile: true, act: async (p) => p.getByRole("button", { name: /Ver lista/ }).click() },
  { id: "m4-listing", section: "Móvil (PWA)", title: "Ficha móvil", path: `/es/listing/${LPG}`, mobile: true },
  { id: "m5-hub", section: "Móvil (PWA)", title: "Homebuyer Hub móvil", path: "/es/app", mobile: true },
  { id: "m6-wizard", section: "Móvil (PWA)", title: "Asistente del propietario en móvil", path: "/es/owner/new", mobile: true, as: "priv", act: (p) => wizardTo(p, 4, { photo: PHOTO }) },
  { id: "m7-leads", section: "Móvil (PWA)", title: "Leads del agente en móvil", path: "/es/agency/leads", mobile: true, as: "agent" },
];

const browser = await chromium.launch();
{
  // A real-looking upload for the wizard: the cover image of a seeded listing.
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto(`${BASE}/es/listing/${LPG}?shot=1`, { waitUntil: "networkidle" });
  const box = await p.evaluate(() => {
    const els = [...document.querySelectorAll("main svg, main img")].map((e) => e.getBoundingClientRect()).sort((a, b) => b.width * b.height - a.width * a.height);
    const r = els[0];
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  await p.screenshot({ path: PHOTO, type: "jpeg", quality: 85, clip: box });
  await p.close();
}
const index = [];
for (const s of SHOTS) {
  if (only && !s.id.includes(only)) continue;
  const ctx = await browser.newContext({
    viewport: s.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: s.mobile ? 2 : 1,
    isMobile: !!s.mobile,
    hasTouch: !!s.mobile,
  });
  await login(ctx, BASE, s.as === undefined ? "seeker" : s.as);
  if (s.compare) await ctx.addInitScript((v) => { try { localStorage.setItem("np-compare-v1", v); } catch {} }, JSON.stringify(s.compare));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const url = BASE + s.path + (s.path.includes("?") ? "&" : "?") + "shot=1";
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  if (s.act) {
    await s.act(page);
    await page.waitForTimeout(700);
  }
  const file = `${s.id}.jpg`;
  await page.screenshot({ path: OUT + file, fullPage: !!s.full, type: "jpeg", quality: 84 });
  index.push({ id: s.id, section: s.section, title: s.title, file, path: s.path, mobile: !!s.mobile });
  console.log(errors.length ? "✗" : "✓", s.id, errors.slice(0, 1).join(" ").slice(0, 160));
  await ctx.close();
}
await browser.close();
if (!only) writeFileSync(OUT + "index.json", JSON.stringify(index, null, 2));
