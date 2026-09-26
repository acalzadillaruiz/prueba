export const ROLES = [
  "SUPERADMIN",
  "AGENCY_OWNER",
  "AGENT",
  "CAPTOR",
  "PHOTOGRAPHER",
  "BACKOFFICE",
  "OWNER_PRIVATE",
  "SEEKER",
] as const;
export type Role = (typeof ROLES)[number];

export type Action =
  | "search.save"
  | "lead.request"
  | "fsbo.publish"
  | "owner.delegate"
  | "listing.crud"
  | "listing.assignAgent"
  | "commission.view"
  | "billing.flags"
  | "tenant.impersonate";

/** "own" = only resources the user owns / is assigned to. "capture" / "photos" = partial scopes. */
export type Scope = true | "own" | "capture" | "photos" | "read";

const ALL: Role[] = [...ROLES];

export const matrix: Record<Action, Partial<Record<Role, Scope>>> = {
  "search.save": Object.fromEntries(ALL.map((r) => [r, true])),
  "lead.request": { SEEKER: true, OWNER_PRIVATE: true },
  "fsbo.publish": { OWNER_PRIVATE: true },
  "owner.delegate": { OWNER_PRIVATE: true },
  "listing.crud": {
    AGENT: "own",
    CAPTOR: "capture",
    PHOTOGRAPHER: "photos",
    BACKOFFICE: true,
    AGENCY_OWNER: true,
    SUPERADMIN: true,
  },
  "listing.assignAgent": { BACKOFFICE: true, AGENCY_OWNER: true, SUPERADMIN: true },
  "commission.view": { AGENT: "own", BACKOFFICE: true, AGENCY_OWNER: true, SUPERADMIN: true },
  "billing.flags": { AGENCY_OWNER: "read", SUPERADMIN: true },
  "tenant.impersonate": { SUPERADMIN: true },
};

export function can(role: Role, action: Action): Scope | false {
  return matrix[action][role] ?? false;
}
