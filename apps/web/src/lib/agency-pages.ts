import type { Role } from "@newplace/config";

/** Which agency roles may open each back-office page. Shared by the sidebar and the server-side page guards. */
export type AgencyPage = "dashboard" | "leads" | "listings" | "calendar" | "capture" | "media" | "team" | "reports" | "settings";

export const AGENCY_PAGE_ROLES: Record<AgencyPage, Role[]> = {
  dashboard: ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"],
  leads: ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "SUPERADMIN"],
  listings: ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "CAPTOR", "PHOTOGRAPHER", "SUPERADMIN"],
  calendar: ["AGENCY_OWNER", "AGENT", "BACKOFFICE", "PHOTOGRAPHER", "SUPERADMIN"],
  capture: ["AGENCY_OWNER", "CAPTOR", "BACKOFFICE", "SUPERADMIN"],
  media: ["AGENCY_OWNER", "PHOTOGRAPHER", "BACKOFFICE", "SUPERADMIN"],
  team: ["AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"],
  reports: ["AGENCY_OWNER", "BACKOFFICE", "SUPERADMIN"],
  settings: ["AGENCY_OWNER", "SUPERADMIN"],
};

export const AGENCY_PAGE_PATH: Record<AgencyPage, string> = {
  dashboard: "",
  leads: "/leads",
  listings: "/listings",
  calendar: "/calendar",
  capture: "/capture",
  media: "/media",
  team: "/team",
  reports: "/reports",
  settings: "/settings",
};

/** First page a role may open (CAPTOR → capture, PHOTOGRAPHER → media…). */
export function agencyHome(role: Role): string {
  const order: AgencyPage[] = ["dashboard", "capture", "media", "listings"];
  const p = order.find((k) => AGENCY_PAGE_ROLES[k].includes(role)) ?? "listings";
  return AGENCY_PAGE_PATH[p];
}
