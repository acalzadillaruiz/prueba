import type { Locale } from "@/types/domain";
import { prisma } from "@newplace/db";
import { CalendarView, type CalEvent } from "@/components/agency/Calendar";
import { NoAgency } from "@/components/agency/NoAgency";
import { getSlots } from "@/server/data";
import { requireAgencyPage } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Page({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ w?: string }> }) {
  const { locale } = await params;
  const week = Number((await searchParams).w ?? 0) || 0;
  const g = await requireAgencyPage(locale, "calendar");
  if (!g) return <NoAgency locale={locale} />;
  const user = { ...g.user, agencyId: g.agencyId };
  // Monday 00:00 America/Caracas of the requested week
  const nowLocal = new Date(Date.now() - 4 * 3600e3);
  const dow = (nowLocal.getUTCDay() + 6) % 7;
  const mondayLocal = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate() - dow + week * 7);
  const start = new Date(mondayLocal + 4 * 3600e3);
  const end = new Date(start.getTime() + 7 * 864e5);
  const mineOnly = user.role === "AGENT" || user.role === "PHOTOGRAPHER";
  const [tours, jobs, slots] = await Promise.all([
    user.role === "PHOTOGRAPHER" ? [] : prisma.tour.findMany({ where: { start: { gte: start, lt: end }, listing: { agencyId: user.agencyId }, ...(mineOnly ? { agentId: user.id } : {}) }, include: { listing: { select: { zone: true } }, agent: { select: { name: true } } } }),
    prisma.mediaJob.findMany({ where: { date: { gte: start, lt: end }, listing: { agencyId: user.agencyId }, ...(user.role === "PHOTOGRAPHER" ? { photographerId: user.id } : {}) }, include: { listing: { select: { zone: true } }, photographer: { select: { name: true } } } }),
    getSlots(user.id),
  ]);
  const events: CalEvent[] = [
    ...tours.map((t) => ({ id: t.id, tourId: t.id, start: t.start.toISOString(), title: t.seekerName, sub: t.listing.zone, kind: (t.status === "DONE" ? "done" : t.status === "CANCELLED" ? "cancelled" : t.status === "REQUESTED" ? "req" : "tour") as CalEvent["kind"], agentName: t.agent.name ?? "" })),
    ...jobs.map((m) => ({ id: m.id, start: m.date.toISOString(), title: locale === "es" ? "Sesión de fotos" : "Photo shoot", sub: m.listing.zone, kind: "media" as const, agentName: m.photographer.name ?? "" })),
  ];
  const allDays = [0, 1, 2, 3, 4, 5, 6].map((d) => slots.find((s) => s.day === d) ?? { day: d, hours: [] });
  return <CalendarView locale={locale} weekStart={start.toISOString()} week={week} events={events} slots={allDays} canEditSlots={user.role === "AGENT" || user.role === "AGENCY_OWNER"} />;
}
