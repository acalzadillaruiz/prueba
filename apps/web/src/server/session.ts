import "server-only";
import { cache } from "react";
import { prisma } from "@newplace/db";
import { auth } from "@/auth";
import type { AppUser } from "@/lib/store";
import { getAgencies } from "./data";

/** Current user for server components (cached per request). */
export const getAppUser = cache(async (): Promise<AppUser | null> => {
  const s = await auth();
  if (!s?.user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: s.user.id } });
  if (!u || u.suspended) return null;
  const name = u.name ?? u.email;
  return {
    id: u.id,
    name,
    email: u.email,
    role: s.user.role,
    agencyId: s.user.agencyId,
    hue: u.hue,
    initials: name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase(),
    phone: u.phone ?? undefined,
  };
});

export const getAppAgency = cache(async (agencyId: string | null) => {
  if (!agencyId) return null;
  return (await getAgencies()).find((a) => a.id === agencyId) ?? null;
});
