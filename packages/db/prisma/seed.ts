/**
 * Seed Venezuela (brief §12). Run: npm run db:seed
 * Reuses the prototype fixtures in apps/web/src/mock and shifts every date so the data feels "live" at seed time.
 */
import bcrypt from "bcryptjs";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { heuristicLeadScore } from "@newplace/ai";
import { PrismaClient, type Prisma } from "@prisma/client";
import { AGENCIES, NOW, USERS } from "./seed-data/people";
import { LISTINGS } from "./seed-data/listings";
import { ZONES } from "./seed-data/zones";
import { AGENT_SLOTS, AUDIT, CAPTURES, EMAILS, FX_RATES, LEADS, MEDIA_JOBS, MODERATION_QUEUE, OFFERS, OWNER_THREAD, SAVED_SEARCHES, TOURS } from "./seed-data/ops";

const prisma = new PrismaClient();
const SHIFT = Date.now() - NOW.getTime();
const d = (iso: string) => new Date(new Date(iso).getTime() + SHIFT);
const PASSWORD = "NewPlace!2026";

async function main() {
  console.log("Seeding New Place (VE)…");
  // wipe (order matters for FKs)
  const tables = [
    "Message", "ThreadParticipant", "MessageThread", "LeadEvent", "Tour", "Lead", "TourSlot", "SavedListing", "SavedSearch", "Offer", "Mandate",
    "CaptureLead", "MediaJob", "CommissionEntry", "CommissionRule", "ListingPhoto", "ListingPriceHistory", "PlaceEstimateSnapshot", "DuplicateFingerprint",
    "Listing", "Invitation", "AgencyMember", "Agency", "Session", "Account", "AuditLog", "User", "Zone", "FxRate", "EmailOutbox", "PlatformSetting", "ModerationReport",
  ];
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`);

  const hash = await bcrypt.hash(PASSWORD, 10);
  await prisma.zone.createMany({ data: ZONES.map((z) => ({ ...z })) });

  for (const a of AGENCIES) {
    await prisma.agency.create({
      data: { id: a.id, name: a.name, slug: a.slug, verified: a.verified, plan: a.plan, status: a.status, city: a.city, phone: a.phone, whatsapp: a.whatsapp, color: a.color, initials: a.initials, createdAt: d(a.createdAt) },
    });
    await prisma.commissionRule.create({ data: { agencyId: a.id, salePct: a.commissionPct, agentSplitPct: a.agentSplitPct } });
  }

  for (const u of USERS) {
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: new Date(),
        passwordHash: hash,
        role: u.role,
        phone: u.phone,
        hue: u.hue,
        lastSeenAt: d(u.lastSeen),
        budget: u.role === "SEEKER" ? 250000 : undefined,
        interests: u.id === "u-seeker" ? "Chacao, Altamira, Los Palos Grandes" : undefined,
      },
    });
    if (u.agencyId) await prisma.agencyMember.create({ data: { agencyId: u.agencyId, userId: u.id, role: u.role, verified: !!u.verified, verificationDoc: u.verified ? null : "cedula-en-revision.pdf" } });
  }

  for (const l of LISTINGS) {
    await prisma.listing.create({
      data: {
        id: l.id,
        slug: l.slug,
        titleEs: l.title_es,
        titleEn: l.title_en,
        bodyEs: l.body_es,
        bodyEn: l.body_en,
        address: l.address,
        zone: l.zone,
        city: l.city,
        state: l.state,
        lat: l.lat,
        lng: l.lng,
        kind: l.kind,
        listingType: l.listingType,
        category: l.category,
        luxury: l.luxury,
        furnished: l.furnished,
        pets: l.pets,
        priceAmount: l.priceAmount,
        pricePeriod: l.pricePeriod,
        areaM2: l.areaM2,
        plotM2: l.plotM2,
        beds: l.beds,
        baths: l.baths,
        parking: l.parking,
        yearBuilt: l.yearBuilt,
        amenities: l.amenities,
        status: l.status,
        review: "APPROVED",
        publishedAt: d(l.publishedAt),
        createdAt: d(l.publishedAt),
        updatedAt: d(l.updatedAt),
        agencyId: l.agencyId,
        agentId: l.agentId,
        ownerUserId: l.ownerUserId,
        scenes: l.scenes,
        hasFloorplan: l.hasFloorplan,
        hasVideo: l.hasVideo,
        hasVirtualTour: l.hasVirtualTour,
        privateListing: !!l.privateListing,
        shortRent: (l.shortRent ?? undefined) as Prisma.InputJsonValue | undefined,
        commercial: (l.commercial ?? undefined) as Prisma.InputJsonValue | undefined,
        fingerprint: l.fingerprint,
        quality: l.quality,
        impressions: l.stats.impressions,
        views: Math.round(l.stats.impressions * 0.35),
        saves: l.stats.saves,
        leadsCount: l.stats.leads,
        avgTimeSec: l.stats.avgTimeSec,
        interactions: l.stats.interactions,
        priceHistory: { create: l.priceHistory.map((p) => ({ amount: p.amount, kind: p.kind, date: d(p.date) })) },
        estimates: { create: { mid: l.estimate.mid, low: l.estimate.low, high: l.estimate.high, confidence: l.estimate.confidence, comparables: l.estimate.comparables as unknown as Prisma.InputJsonValue, method: l.estimate.method } },
        fingerprints: { create: { fingerprint: l.fingerprint } },
      },
    });
  }
  // AI-generated photos (apps/web/public/photos/<listingId>-<n>.jpg), if present → real ListingPhoto rows.
  const photoDir = join(__dirname, "../../../apps/web/public/photos");
  if (existsSync(photoDir)) {
    const files = readdirSync(photoDir).filter((f) => /^[a-z0-9]+-\d+\.jpg$/.test(f));
    for (const l of LISTINGS) {
      const mine = files.filter((f) => f.startsWith(`${l.id}-`)).sort((a, b) => Number(a.split("-")[1].split(".")[0]) - Number(b.split("-")[1].split(".")[0]));
      if (mine.length) await prisma.listingPhoto.createMany({ data: mine.map((f, i) => ({ listingId: l.id, url: `/photos/${f}`, order: i, isCover: i === 0, scene: l.scenes[i] })) });
    }
  }
  // two listings pending review so backoffice has something to approve
  await prisma.listing.updateMany({ where: { id: { in: [LISTINGS[12].id, LISTINGS[20].id] } }, data: { review: "PENDING" } });

  for (const lead of LEADS) {
    const listing = LISTINGS.find((l) => l.id === lead.listingId)!;
    const mins = Math.round((NOW.getTime() - Date.parse(lead.createdAt)) / 60000);
    const s = heuristicLeadScore({ createdMinutesAgo: mins, budget: lead.budget, listingPrice: listing.priceAmount, source: lead.source, messages: lead.messages, hasPhone: !!lead.phone, toursRequested: lead.toursRequested });
    const seeker = USERS.find((u) => u.email === lead.email);
    await prisma.lead.create({
      data: {
        id: lead.id,
        listingId: lead.listingId,
        agencyId: lead.agencyId,
        agentId: lead.agentId,
        seekerUserId: seeker?.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        stage: lead.stage,
        source: lead.source,
        budget: lead.budget,
        message: lead.message,
        score: s.score,
        nextAction: s.nextAction,
        reason: s.reason,
        messagesCount: lead.messages,
        toursRequested: lead.toursRequested,
        createdAt: d(lead.createdAt),
        firstResponseAt: lead.firstResponseMin ? new Date(d(lead.createdAt).getTime() + lead.firstResponseMin * 60000) : null,
        events: { create: [{ type: "CREATED", data: { source: lead.source }, createdAt: d(lead.createdAt) }] },
      },
    });
  }

  const agents = USERS.filter((u) => u.role === "AGENT");
  for (const a of agents)
    for (const s of AGENT_SLOTS) for (const h of s.hours) await prisma.tourSlot.create({ data: { agentId: a.id, weekday: s.day, hour: h } });

  for (const t of TOURS) {
    const seeker = USERS.find((u) => u.name === t.seekerName);
    await prisma.tour.create({ data: { id: t.id, listingId: t.listingId, leadId: t.leadId, agentId: t.agentId, seekerUserId: seeker?.id, seekerName: t.seekerName, start: d(t.start), status: t.status } });
  }

  // saved + searches for the demo seeker
  for (const i of [0, 1, 6, 41, 17]) await prisma.savedListing.create({ data: { userId: "u-seeker", listingId: LISTINGS[i].id } });
  for (const s of SAVED_SEARCHES)
    await prisma.savedSearch.create({ data: { userId: "u-seeker", name: s.name.es, query: s.query, frequency: s.frequency.toUpperCase() as "INSTANT", newCount: s.newCount, lastSentAt: d(s.lastSent) } });

  // owner mandate + thread with the agent
  const mandateListing = LISTINGS.find((l) => l.ownerUserId === "u-priv" && l.city === "Barquisimeto")!;
  await prisma.mandate.create({ data: { ownerUserId: "u-priv", agencyId: "ag-andes", agentId: "u-agent", listingId: mandateListing.id, status: "ASSIGNED", createdAt: d(new Date(NOW.getTime() - 3 * 864e5).toISOString()) } });
  const ownerThread = await prisma.messageThread.create({
    data: { listingId: mandateListing.id, subject: "Encargo · Casa en Barquisimeto", participants: { create: [{ userId: "u-priv" }, { userId: "u-agent" }] } },
  });
  for (const m of OWNER_THREAD) await prisma.message.create({ data: { threadId: ownerThread.id, senderId: m.mine ? "u-priv" : "u-agent", body: m.body, createdAt: d(m.at) } });
  await prisma.messageThread.create({ data: { leadId: "ld-01", listingId: LISTINGS[0].id, participants: { create: [{ userId: "u-agent" }] } } });
  // The buyer's first message lives on the lead itself; the thread starts empty until the agent replies

  for (const o of OFFERS) await prisma.offer.create({ data: { listingId: o.listingId, bidderName: o.bidder, amount: o.amount, status: o.status, note: o.note, createdAt: d(o.createdAt) } });
  for (const c of CAPTURES)
    await prisma.captureLead.create({ data: { agencyId: "ag-andes", captorId: c.captorId, address: c.address, zone: c.zone, ownerName: c.ownerName, phone: c.phone, kind: c.kind, areaM2: c.areaM2, askingPrice: c.askingPrice, result: c.result, duplicateOfId: c.duplicateOf, createdAt: d(c.createdAt) } });
  for (const m of MEDIA_JOBS)
    await prisma.mediaJob.create({ data: { listingId: m.listingId, photographerId: m.photographerId, date: d(m.date), status: m.status, photos: m.checklist.photos, cover: m.checklist.cover, floorplan: m.checklist.floorplan, video: m.checklist.video } });

  const won = LEADS.find((l) => l.stage === "WON")!;
  const wonListing = LISTINGS.find((l) => l.id === won.listingId)!;
  await prisma.commissionEntry.create({ data: { agencyId: "ag-andes", listingId: wonListing.id, agentId: won.agentId, amount: Math.round(wonListing.priceAmount * 0.05), agentPart: Math.round(wonListing.priceAmount * 0.025) } });

  for (const f of FX_RATES) await prisma.fxRate.create({ data: { code: f.code, perUsd: f.perUsd, source: f.source } });
  for (const e of EMAILS) await prisma.emailOutbox.create({ data: { to: e.to, subject: e.subject, kind: e.kind, status: e.status, createdAt: d(e.at), sentAt: d(e.at) } });
  const actorByName = (n: string) => USERS.find((u) => u.name === n)?.id;
  for (const a of AUDIT) await prisma.auditLog.create({ data: { actorId: actorByName(a.actor), action: a.action, target: a.target, createdAt: d(a.at) } });
  for (const m of MODERATION_QUEUE)
    await prisma.moderationReport.create({ data: { listingId: m.listingId, title: m.title, reasonEs: m.reason.es, reasonEn: m.reason.en, reporter: m.reporter, agency: m.agency, severity: m.severity, createdAt: d(m.at) } });
  await prisma.platformSetting.create({ data: { key: "aiProvider", value: "heuristic" } });

  const counts = await Promise.all([prisma.listing.count(), prisma.user.count(), prisma.lead.count(), prisma.tour.count(), prisma.agency.count()]);
  console.log(`✓ listings ${counts[0]} · users ${counts[1]} · leads ${counts[2]} · tours ${counts[3]} · agencies ${counts[4]} · password ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
