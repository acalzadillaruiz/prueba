import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import type { AppUser } from "@/lib/store";
import { getAgencies } from "./data";
import { liveIdentity } from "./identity";

/** Current user for server components (cached per request). */
export const getAppUser = cache(async (): Promise<AppUser | null> => {
  const s = await auth();
  if (!s?.user?.id) return null;
  const u = await liveIdentity(s.user.id, s.user.agencyId ?? null);
  if (!u) return null;
  const name = u.name ?? u.email;
  return {
    id: u.id,
    name,
    email: u.email,
    role: u.role,
    agencyId: u.agencyId,
    hue: u.hue,
    initials: name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase(),
    phone: u.phone ?? undefined,
  };
});

export const getAppAgency = cache(async (agencyId: string | null) => {
  if (!agencyId) return null;
  return (await getAgencies()).find((a) => a.id === agencyId) ?? null;
});
