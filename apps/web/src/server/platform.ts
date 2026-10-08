import "server-only";
import { prisma } from "@newplace/db";
import { aiKeyConfigured } from "./ai";
import { getAgencies, getSetting } from "./data";
import { auditPage } from "./audit-log";

const DAY = 864e5;

export async function platformHome(locale: "es" | "en" = "es") {
  const t = (es: string, en: string) => (locale === "en" ? en : es);
  const now = Date.now();
  const [agencies, counts, users, active, leads7d, leadsPrev, responded, leads12w, outbox, aiSetting] = await Promise.all([
    getAgencies(),
    prisma.listing.groupBy({ by: ["agencyId"], _count: true }),
    prisma.user.count(),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.lead.count({ where: { createdAt: { gte: new Date(now - 7 * DAY) } } }),
    prisma.lead.count({ where: { createdAt: { gte: new Date(now - 14 * DAY), lt: new Date(now - 7 * DAY) } } }),
    prisma.lead.findMany({ where: { firstResponseAt: { not: null } }, select: { createdAt: true, firstResponseAt: true }, take: 500, orderBy: { createdAt: "desc" } }),
    prisma.lead.findMany({ where: { createdAt: { gte: new Date(now - 84 * DAY) } }, select: { createdAt: true } }),
    prisma.emailOutbox.count(),
    getSetting("aiProvider", "heuristic"),
  ]);
  const resp = responded.map((l) => (l.firstResponseAt!.getTime() - l.createdAt.getTime()) / 60000).sort((a, b) => a - b);
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const s = now - (12 - i) * 7 * DAY;
    const e = s + 7 * DAY;
    const d = new Date(e);
    return { label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`, value: leads12w.filter((l) => l.createdAt.getTime() >= s && l.createdAt.getTime() < e).length };
  });
  const listingCount = await prisma.listing.count();
  return {
    agencies: agencies.map((a) => ({ ...a, listings: counts.find((c) => c.agencyId === a.id)?._count ?? 0 })),
    users,
    activeListings: active,
    leads7d,
    leadsPrev7d: leadsPrev,
    firstResponseMin: resp.length ? Math.round(resp[Math.floor(resp.length / 2)]) : null,
    weekly,
    // Plain operator language: what works and what's missing, never env var names or provider class names.
    health: [
      { k: t("Base de datos", "Database"), v: t(`${listingCount} inmuebles · ${users} usuarios`, `${listingCount} listings · ${users} users`), ok: true },
      {
        k: t("Motor de valoración", "Valuation engine"),
        v:
          aiSetting === "openai-compatible"
            ? aiKeyConfigured()
              ? t(`proveedor de IA externo${process.env.AI_MODEL ? ` (${process.env.AI_MODEL})` : ""}`, `external AI provider${process.env.AI_MODEL ? ` (${process.env.AI_MODEL})` : ""}`)
              : t("falta la clave del proveedor de IA: se usan las reglas internas", "AI provider key missing: using internal rules")
            : t("reglas internas (sin proveedor de IA)", "internal rules (no AI provider)"),
        ok: aiSetting === "heuristic" || aiKeyConfigured(),
      },
      { k: t("Mapa", "Map"), v: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ? t("Google Maps activo", "Google Maps on") : t("ilustrativo (falta la clave de Google Maps)", "illustrated (Google Maps key missing)"), ok: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY },
      {
        k: t("Inicio de sesión", "Sign-in"),
        v: [t("email y contraseña", "email and password"), process.env.AUTH_GOOGLE_ID ? t("cuenta de Google", "Google account") : null, process.env.DEMO_AUTH === "true" ? t("modo demostración activo", "demo mode on") : null].filter(Boolean).join(" · "),
        ok: true,
      },
      {
        k: t("Correos", "Emails"),
        v: process.env.RESEND_API_KEY && process.env.EMAIL_FROM
          ? t(`${outbox} en el registro · se envían`, `${outbox} logged · being sent`)
          : t(`${outbox} en el registro · no se envían (falta el servicio de correo)`, `${outbox} logged · not sent (no email service set up)`),
        ok: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      },
      { k: t("Fotos", "Photos"), v: process.env.STORAGE === "s3" ? t("guardadas en la nube", "stored in the cloud") : t("guardadas en este servidor", "stored on this server"), ok: true },
    ],
    // Same resolver as /platform/audit: targets stored as ids show as names; actor "" = system.
    audit: await humanAuditRows((await auditPage({ take: 10 })).items, locale),
  };
}

/** Audit values written as codes by older entries/seed data, shown in plain words. */
const LEGACY_VALUES: Record<string, [string, string]> = {
  NEW: ["Nuevo", "New"], CONTACTED: ["Contactado", "Contacted"], TOUR: ["Visita", "Tour"], OFFER: ["Oferta", "Offer"], WON: ["Ganado", "Won"], LOST: ["Perdido", "Lost"],
  heuristic: ["Reglas internas", "Internal rules"], "heuristic (default)": ["Reglas internas (por defecto)", "Internal rules (default)"], "openai-compatible": ["Proveedor de IA externo", "External AI provider"],
};

/**
 * Older audit rows store targets like "ld-04 → CONTACTED" or "heuristic": show "Carlos Medina → Contactado" /
 * "Reglas internas" instead of ids and enum codes.
 */
export async function humanAuditRows<T extends { action: string; target: string }>(rows: T[], locale: "es" | "en" = "es"): Promise<T[]> {
  const pick = (v: [string, string]) => (locale === "en" ? v[1] : v[0]);
  const arrow = /^(\S+) → ([A-Za-z_]+)$/;
  const ids = [...new Set(rows.map((r) => arrow.exec(r.target)?.[1]).filter((x): x is string => !!x))];
  const names = new Map<string, string>();
  if (ids.length) {
    const [leads, listings, users, agencies] = await Promise.all([
      prisma.lead.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
      prisma.listing.findMany({ where: { id: { in: ids } }, select: { id: true, titleEs: true } }),
      prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } }),
      prisma.agency.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
    ]);
    for (const x of leads) names.set(x.id, x.name);
    for (const x of listings) names.set(x.id, x.titleEs);
    for (const x of users) names.set(x.id, x.name ?? x.email);
    for (const x of agencies) names.set(x.id, x.name);
  }
  return rows.map((r) => {
    const m = arrow.exec(r.target);
    if (m) return { ...r, target: `${names.get(m[1]) ?? m[1]} → ${LEGACY_VALUES[m[2]] ? pick(LEGACY_VALUES[m[2]]) : m[2]}` };
    if (LEGACY_VALUES[r.target]) return { ...r, target: pick(LEGACY_VALUES[r.target]) };
    return r;
  });
}
