import type { Agency, User } from "@/types/domain";

export const NOW = new Date("2026-09-26T14:00:00-04:00");
export const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
export const inMinutes = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();
/** A plausible appointment time in Caracas (UTC−4): `days` from today's Caracas date, at hour:minute local time. */
export const caracasAt = (days: number, hour: number, minute = 0) => {
  const local = new Date(NOW.getTime() - 4 * 3_600_000); // shift to Caracas wall clock
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + days, hour + 4, minute)).toISOString();
};

/** Guardia 24/7 rotation per agency: weekday ("0" = Sunday … "6" = Saturday, Caracas time) → member on call. */
type OnCall = Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", string>;

export const AGENCIES: (Agency & { onCall: OnCall })[] = [
  { id: "ag-andes", name: "Andes Prime", slug: "andes-prime", verified: true, plan: "PRO", city: "Caracas", phone: "+58 212 555 0142", whatsapp: "+58 414 555 0142", color: "#F26B4D", initials: "AP", commissionPct: 5, agentSplitPct: 50, createdAt: minutesAgo(60 * 24 * 410), status: "ACTIVE", onCall: { "1": "u-agent", "2": "u-agent2", "3": "u-agent", "4": "u-agent", "5": "u-agent2", "6": "u-owner", "0": "u-agent" } },
  { id: "ag-night", name: "Caracas Night Realty", slug: "caracas-night-realty", verified: true, plan: "ENTERPRISE", city: "Caracas", phone: "+58 212 555 0199", whatsapp: "+58 424 555 0199", color: "#D4AF77", initials: "CN", commissionPct: 5, agentSplitPct: 45, createdAt: minutesAgo(60 * 24 * 620), status: "ACTIVE", onCall: { "1": "u-agent3", "2": "u-agent4", "3": "u-agent3", "4": "u-agent4", "5": "u-owner2", "6": "u-agent3", "0": "u-agent4" } },
  { id: "ag-orinoco", name: "Orinoco Commercial", slug: "orinoco-commercial", verified: false, plan: "FREE", city: "Valencia", phone: "+58 241 555 0107", whatsapp: "+58 412 555 0107", color: "#8AA4B5", initials: "OC", commissionPct: 4, agentSplitPct: 50, createdAt: minutesAgo(60 * 24 * 38), status: "TRIAL", onCall: { "1": "u-agent6", "2": "u-agent7", "3": "u-agent6", "4": "u-agent7", "5": "u-agent6", "6": "u-agent7", "0": "u-agent6" } },
];

export const USERS: User[] = [
  { id: "u-super", name: "Mariana Lugo", email: "superadmin@newplace.app", role: "SUPERADMIN", initials: "ML", hue: 12, lastSeen: minutesAgo(2) },
  { id: "u-owner", name: "Ricardo Andrade", email: "owner@andesprime.ve", role: "AGENCY_OWNER", agencyId: "ag-andes", initials: "RA", hue: 210, verified: true, phone: "+58 414 555 0101", lastSeen: minutesAgo(9) },
  { id: "u-agent", name: "Valentina Rojas", email: "agent@andesprime.ve", role: "AGENT", agencyId: "ag-andes", initials: "VR", hue: 340, verified: true, phone: "+58 414 555 0123", lastSeen: minutesAgo(1) },
  { id: "u-agent2", name: "Andrés Mejías", email: "andres@andesprime.ve", role: "AGENT", agencyId: "ag-andes", initials: "AM", hue: 160, verified: true, phone: "+58 412 555 0178", lastSeen: minutesAgo(33) },
  { id: "u-agent5", name: "Patricia Salas", email: "patricia@andesprime.ve", role: "AGENT", agencyId: "ag-andes", initials: "PS", hue: 280, verified: false, phone: "+58 424 555 0190", lastSeen: minutesAgo(240) },
  { id: "u-captor", name: "Rosa Hernández", email: "rosa@andesprime.ve", role: "CAPTOR", agencyId: "ag-andes", initials: "RH", hue: 40, lastSeen: minutesAgo(18) },
  { id: "u-photo", name: "Miguel Díaz", email: "miguel@andesprime.ve", role: "PHOTOGRAPHER", agencyId: "ag-andes", initials: "MD", hue: 190, lastSeen: minutesAgo(52) },
  { id: "u-back", name: "Sofía Blanco", email: "sofia@andesprime.ve", role: "BACKOFFICE", agencyId: "ag-andes", initials: "SB", hue: 90, lastSeen: minutesAgo(6) },
  { id: "u-agent3", name: "Carolina Pérez", email: "carolina@caracasnight.ve", role: "AGENT", agencyId: "ag-night", initials: "CP", hue: 20, verified: true, phone: "+58 424 555 0131", lastSeen: minutesAgo(14) },
  { id: "u-agent4", name: "Luis Ferrer", email: "luis@caracasnight.ve", role: "AGENT", agencyId: "ag-night", initials: "LF", hue: 230, verified: true, phone: "+58 412 555 0147", lastSeen: minutesAgo(71) },
  { id: "u-owner2", name: "Elena Márquez", email: "elena@caracasnight.ve", role: "AGENCY_OWNER", agencyId: "ag-night", initials: "EM", hue: 45, verified: true, lastSeen: minutesAgo(120) },
  { id: "u-agent6", name: "Daniela Montilla", email: "daniela@orinoco.ve", role: "AGENT", agencyId: "ag-orinoco", initials: "DM", hue: 300, verified: false, lastSeen: minutesAgo(300) },
  { id: "u-agent7", name: "Gabriel Suárez", email: "gabriel@orinoco.ve", role: "AGENCY_OWNER", agencyId: "ag-orinoco", initials: "GS", hue: 130, verified: false, lastSeen: minutesAgo(1440) },
  { id: "u-seeker", name: "Daniel Ortega", email: "seeker@gmail.com", role: "SEEKER", initials: "DO", hue: 200, phone: "+58 424 555 0166", lastSeen: minutesAgo(0) },
  { id: "u-priv", name: "Isabel Contreras", email: "owner.priv@gmail.com", role: "OWNER_PRIVATE", initials: "IC", hue: 25, phone: "+58 414 555 0133", lastSeen: minutesAgo(26) },
  { id: "u-seeker2", name: "Jorge Castillo", email: "jorge.castillo@gmail.com", role: "SEEKER", initials: "JC", hue: 110, lastSeen: minutesAgo(600) },
];

export const userById = (id?: string) => USERS.find((u) => u.id === id);
export const agencyById = (id?: string) => AGENCIES.find((a) => a.id === id);

export const DEMO_LOGINS = [
  { userId: "u-seeker", label: { es: "Buscador", en: "Seeker" }, home: "/app" },
  { userId: "u-priv", label: { es: "Propietario particular", en: "Private owner" }, home: "/owner/listings" },
  { userId: "u-agent", label: { es: "Agente", en: "Agent" }, home: "/agency/leads" },
  { userId: "u-owner", label: { es: "Dueño de agencia", en: "Agency owner" }, home: "/agency" },
  { userId: "u-captor", label: { es: "Captador", en: "Captor" }, home: "/agency/capture" },
  { userId: "u-photo", label: { es: "Fotógrafo", en: "Photographer" }, home: "/agency/media" },
  { userId: "u-back", label: { es: "Backoffice", en: "Backoffice" }, home: "/agency/listings" },
  { userId: "u-super", label: { es: "Superadmin", en: "Superadmin" }, home: "/platform" },
] as const;
