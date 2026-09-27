import type { NextRequest } from "next/server";
import { handler } from "@/server/api";
import { limit } from "@/server/rate-limit";
import { bump } from "@/server/counters";

type Ctx = { params: Promise<{ id: string }> };

/**
 * View counter (beacon from the cached public page). Uses bump() so a view never changes `updatedAt`.
 */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  await limit(req, "view", 120, 60);
  const { id } = await params;
  await bump([id], ["views", "interactions"]);
  return new Response(null, { status: 204 });
});
