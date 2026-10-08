import type { NextRequest } from "next/server";
import { handler, ok } from "@/server/api";
import { onCallAdvisors } from "@/server/on-call";

const ID = /^[\w-]{1,64}$/;
const SLUG = /^[\w-]{1,200}$/;

/**
 * Public: today's Guardia 24/7 advisor per verified, active agency (Caracas weekday). No session is read, so the
 * response is the same for everyone and can be cached at the edge for a few minutes.
 * `?agencyId=` restricts to one agency; `?listing=<slug>` restricts to that listing's agency only.
 */
export const GET = handler(async (req: NextRequest) => {
  const sp = new URL(req.url).searchParams;
  const agencyId = sp.get("agencyId") ?? undefined;
  const listing = sp.get("listing") ?? undefined;
  // A malformed agency id matches no agency (never "all agencies").
  // Likewise a malformed listing slug matches no listing (never "every agency").
  const bad = (agencyId && !ID.test(agencyId)) || (listing && !SLUG.test(listing));
  const advisors = bad ? [] : await onCallAdvisors({ agencyId, listingSlug: listing });
  const res = ok({ advisors });
  res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res;
});
