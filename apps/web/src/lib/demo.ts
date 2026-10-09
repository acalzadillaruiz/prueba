/** DEMO_AUTH=true: "Entrar como…" accounts from the Venezuela seed (private preview only: /login?preview=1). */
export const DEMO_LOGINS = [
  { email: "seeker@gmail.com", label: { es: "Buscador", en: "Seeker" }, home: "/app", initials: "DO", hue: 200 },
  { email: "owner.priv@gmail.com", label: { es: "Propietario particular", en: "Private owner" }, home: "/owner/listings", initials: "IC", hue: 25 },
  { email: "agent@andesprime.ve", label: { es: "Agente", en: "Agent" }, home: "/agency/leads", initials: "VR", hue: 340 },
  { email: "owner@andesprime.ve", label: { es: "Dueño de agencia", en: "Agency owner" }, home: "/agency", initials: "RA", hue: 210 },
  { email: "rosa@andesprime.ve", label: { es: "Captador", en: "Captor" }, home: "/agency/capture", initials: "RH", hue: 40 },
  { email: "miguel@andesprime.ve", label: { es: "Fotógrafo", en: "Photographer" }, home: "/agency/media", initials: "MD", hue: 190 },
  { email: "sofia@andesprime.ve", label: { es: "Backoffice", en: "Backoffice" }, home: "/agency/listings", initials: "SB", hue: 90 },
  { email: "superadmin@newplace.app", label: { es: "Superadmin", en: "Superadmin" }, home: "/platform", initials: "ML", hue: 12 },
] as const;

const DEMO_EMAILS: ReadonlySet<string> = new Set(DEMO_LOGINS.map((d) => d.email));

/** The Auth.js "demo" provider only accepts these seeded accounts (exact, case-insensitive match). */
export const isDemoEmail = (email: string) => DEMO_EMAILS.has(email.trim().toLowerCase());

export const DEMO_ENABLED = process.env.NEXT_PUBLIC_DEMO_AUTH === "true";

/** The "sign in as…" chooser is part of the private preview flow (/login?preview=1), never of the public login. */
export const PREVIEW_PARAM = "preview";
