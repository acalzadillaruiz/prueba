import "server-only";
import { prisma } from "@newplace/db";
import { publicWhere } from "./listings";

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Area report computed from the platform's own published listings (not static figures): median sale and rent
 * price per m², active supply and median days on market. Falls back to the zone's reference figures when there
 * are fewer than 2 samples, and says so (`live: false`).
 */
export async function zoneStats(zone: string) {
  const [rows, ref] = await Promise.all([
    prisma.listing.findMany({
      where: { AND: [publicWhere(), { zone, kind: { notIn: ["land", "warehouse"] } }] },
      select: { listingType: true, priceAmount: true, areaM2: true, status: true, publishedAt: true },
    }),
    prisma.zone.findUnique({ where: { name: zone } }),
  ]);
  const available = rows.filter((r) => ["ACTIVE", "COMING_SOON", "UNDER_OFFER"].includes(r.status));
  const sale = rows.filter((r) => r.listingType === "SALE" && r.areaM2 > 0).map((r) => r.priceAmount / r.areaM2);
  const rent = rows.filter((r) => r.listingType === "LONG_RENT" && r.areaM2 > 0).map((r) => r.priceAmount / r.areaM2);
  const now = Date.now();
  const dom = available.filter((r) => r.publishedAt).map((r) => (now - r.publishedAt!.getTime()) / 864e5);
  const pick = (samples: number[], fallback: number | undefined) => (samples.length >= 2 ? median(samples)! : (fallback ?? median(samples) ?? 0));
  return {
    salePpm: Math.round(pick(sale, ref?.salePpm)),
    rentPpm: Math.round(pick(rent, ref?.rentPpm) * 10) / 10,
    activeListings: available.length,
    daysOnMarket: Math.round(pick(dom, ref?.daysOnMarket)),
    live: sale.length >= 2 || rent.length >= 2,
  };
}
