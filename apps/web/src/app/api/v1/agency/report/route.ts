import { prisma } from "@newplace/db";
import { ApiError, currentUser, handler, requireUser } from "@/server/api";
import { isManager, requireAgency } from "@/server/access";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV export for the agency owner / backoffice. */
export const GET = handler(async () => {
  const u = requireUser(await currentUser());
  if (!isManager(u) && u.role !== "SUPERADMIN") throw new ApiError("FORBIDDEN");
  const agencyId = requireAgency(u);
  const rows = await prisma.listing.findMany({ where: { agencyId }, include: { agent: { select: { name: true } }, estimates: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { updatedAt: "desc" } });
  const head = ["id", "slug", "titulo", "zona", "ciudad", "operacion", "estado", "precio_usd", "m2", "agente", "impresiones", "vistas", "guardados", "leads", "dias_en_mercado", "placeestimate_usd", "calidad"];
  const lines = rows.map((l) =>
    [l.id, l.slug, l.titleEs, l.zone, l.city, l.listingType, l.status, l.priceAmount, l.areaM2, l.agent?.name, l.impressions, l.views, l.saves, l.leadsCount, l.publishedAt ? Math.round((Date.now() - l.publishedAt.getTime()) / 864e5) : "", l.estimates[0]?.mid, l.quality].map(esc).join(","),
  );
  const csv = "﻿" + [head.join(","), ...lines].join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="informe-${new Date().toISOString().slice(0, 10)}.csv"` } });
});
