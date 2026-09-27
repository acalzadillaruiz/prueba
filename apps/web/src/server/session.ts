import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { AGENCY_PAGE_PATH, AGENCY_PAGE_ROLES, agencyHome, type AgencyPage } from "@/lib/agency-pages";
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

/**
 * Server-side guard for back-office pages: signed in, member of an active agency and allowed for this page.
 * Returns the user and agency id, or null when a superadmin has not picked an agency (caller shows <NoAgency/>).
 */
export async function requireAgencyPage(locale: string, page: AgencyPage) {
  const user = await getAppUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/agency${AGENCY_PAGE_PATH[page]}`);
  if (!AGENCY_PAGE_ROLES[page].includes(user.role)) {
    if (!AGENCY_PAGE_ROLES.listings.includes(user.role)) redirect(`/${locale}?denied=agency`);
    redirect(`/${locale}/agency${agencyHome(user.role)}`);
  }
  // No agencyId: a superadmin who hasn't picked a tenant, or staff of a suspended agency (see liveIdentity).
  if (!user.agencyId) {
    if (user.role === "SUPERADMIN") return null;
    redirect(`/${locale}?denied=suspended`);
  }
  return { user, agencyId: user.agencyId };
}
