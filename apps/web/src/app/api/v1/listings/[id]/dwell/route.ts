import type { NextRequest } from "next/server";
import { handler } from "@/server/api";
import { limit } from "@/server/rate-limit";
import { DWELL_MAX, recordDwell } from "@/server/counters";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Dwell-time beacon: the public page sends `{ "s": seconds }` on pagehide (navigator.sendBeacon, so the body may
 * arrive as text/plain). Feeds the "Tiempo medio" running average (1–1800 s) without touching `updatedAt`.
 * Unauthenticated and fire-and-forget: rate-limited like the view beacon, malformed input is ignored (204).
 */
export const POST = handler(async (req: NextRequest, { params }: Ctx) => {
  await limit(req, "dwell", 120, 60);
  const { id } = await params;
  const raw = (await req.text().catch(() => "")).slice(0, 200);
  let s = Number(req.nextUrl.searchParams.get("s"));
  if (!Number.isFinite(s) || s <= 0) {
    try {
      s = Number((JSON.parse(raw) as { s?: unknown })?.s);
    } catch {
      s = NaN;
    }
  }
  // Sub-second visits are bounces, not reading time; absurd values are clamped by recordDwell (max DWELL_MAX).
  if (id.length <= 64 && Number.isFinite(s) && s >= 1 && s <= DWELL_MAX * 24) await recordDwell(id, s);
  return new Response(null, { status: 204 });
});
