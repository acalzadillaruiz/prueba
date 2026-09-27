import type { NextRequest } from "next/server";
import { prisma } from "@newplace/db";
import { handler } from "@/server/api";
import { limit } from "@/server/rate-limit";
import { bump } from "@/server/counters";
import { PUBLIC_STATUSES } from "@/server/listings";

type Ctx = { params: Promise<{ id: string }> };

/**
 * View counter (beacon from the cached public page). Uses bump() so a view never changes `updatedAt`.
 * Only listings with a public page (published + approved, incl. link-only private ones) count: drafts, reviews and
 * taken-down listings cannot be inflated through this unauthenticated endpoint.
 */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  await limit(req, "view", 120, 60);
  const { id } = await params;
  if (id.length <= 64 && (await prisma.listing.count({ where: { id, status: { in: PUBLIC_STATUSES }, review: "APPROVED" } }))) await bump([id], ["views", "interactions"]);
  return new Response(null, { status: 204 });
});
