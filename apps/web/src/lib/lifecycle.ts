import type { ListingStatus, Locale } from "@/types/domain";

/**
 * One human lifecycle for listings and owner mandates, shared by every private view (agency table, mandates list,
 * dashboard, owner area). Pure: no DB access, the database enums are unchanged — this only decides what a person reads.
 *
 * Listing:  Borrador → En revisión → Publicada (Próximamente / En oferta) → Pausada → Vendida / Alquilada · Rechazada · Vencida · Retirada
 * Mandate:  Solicitado → Asignado → En preparación → Publicado · Rechazado
 */

export type ListingPhase = "DRAFT" | "IN_REVIEW" | "REJECTED" | "COMING_SOON" | "PUBLISHED" | "UNDER_OFFER" | "PAUSED" | "SOLD" | "RENTED" | "EXPIRED" | "TAKEN_DOWN";
export type MandatePhase = "REQUESTED" | "ASSIGNED" | "PREPARING" | "PUBLISHED" | "DECLINED";
export type PhaseTone = "neutral" | "egeo" | "arena" | "ok" | "warn" | "danger" | "navy" | "muted";

type Label = { es: string; en: string; tone: PhaseTone; hint_es: string; hint_en: string };

export const LISTING_PHASE: Record<ListingPhase, Label> = {
  DRAFT: { es: "Borrador", en: "Draft", tone: "muted", hint_es: "Aún no es visible en el portal.", hint_en: "Not visible on the portal yet." },
  IN_REVIEW: { es: "En revisión", en: "In review", tone: "warn", hint_es: "Espera la aprobación de un responsable de la agencia.", hint_en: "Waiting for a manager to approve it." },
  REJECTED: { es: "Rechazada", en: "Rejected", tone: "danger", hint_es: "Corrígela y se reenvía a revisión.", hint_en: "Edit it and it goes back to review." },
  COMING_SOON: { es: "Próximamente", en: "Coming soon", tone: "neutral", hint_es: "Visible como próxima, sin aceptar visitas aún.", hint_en: "Shown as upcoming, no tours yet." },
  PUBLISHED: { es: "Publicada", en: "Published", tone: "egeo", hint_es: "Visible en el portal.", hint_en: "Live on the portal." },
  UNDER_OFFER: { es: "En oferta", en: "Under offer", tone: "arena", hint_es: "Publicada, con una oferta en curso.", hint_en: "Live, with an offer in progress." },
  PAUSED: { es: "Pausada", en: "Paused", tone: "muted", hint_es: "Oculta del portal; puedes reactivarla.", hint_en: "Hidden from the portal; you can reactivate it." },
  SOLD: { es: "Vendida", en: "Sold", tone: "navy", hint_es: "Operación cerrada.", hint_en: "Deal closed." },
  RENTED: { es: "Alquilada", en: "Rented", tone: "navy", hint_es: "Operación cerrada.", hint_en: "Deal closed." },
  EXPIRED: { es: "Vencida", en: "Expired", tone: "muted", hint_es: "Caducó su vigencia.", hint_en: "Its listing period ended." },
  TAKEN_DOWN: { es: "Retirada", en: "Taken down", tone: "danger", hint_es: "Retirada por moderación de la plataforma.", hint_en: "Taken down by platform moderation." },
};

export const MANDATE_PHASE: Record<MandatePhase, Label> = {
  REQUESTED: { es: "Solicitado", en: "Requested", tone: "arena", hint_es: "El propietario lo pidió; falta asignar un agente.", hint_en: "The owner asked for it; assign an agent." },
  ASSIGNED: { es: "Asignado", en: "Assigned", tone: "egeo", hint_es: "Un agente lo tiene a cargo.", hint_en: "An agent is in charge." },
  PREPARING: { es: "En preparación", en: "In preparation", tone: "egeo", hint_es: "El agente está completando la ficha.", hint_en: "The agent is completing the listing." },
  PUBLISHED: { es: "Publicado", en: "Published", tone: "ok", hint_es: "Ya está en el portal.", hint_en: "Live on the portal." },
  DECLINED: { es: "Rechazado", en: "Declined", tone: "danger", hint_es: "La agencia no lo tomó o se canceló.", hint_en: "Declined or cancelled." },
};

type ListingLike = { status: ListingStatus; review?: "PENDING" | "APPROVED" | "REJECTED" | null; takedownReason?: string | null };

/** The one phase a listing is in. Review wins while it isn't approved (except for drafts and paused listings). */
export function listingPhase(l: ListingLike): ListingPhase {
  if (l.takedownReason) return "TAKEN_DOWN";
  const reviewable = l.status !== "DRAFT" && l.status !== "WITHDRAWN";
  if (reviewable && l.review === "PENDING") return "IN_REVIEW";
  if (reviewable && l.review === "REJECTED") return "REJECTED";
  switch (l.status) {
    case "DRAFT":
      return l.review === "REJECTED" ? "REJECTED" : "DRAFT";
    case "COMING_SOON":
      return "COMING_SOON";
    case "ACTIVE":
      return "PUBLISHED";
    case "UNDER_OFFER":
      return "UNDER_OFFER";
    case "WITHDRAWN":
      return "PAUSED";
    case "SOLD":
      return "SOLD";
    case "RENTED":
      return "RENTED";
    default:
      return "EXPIRED";
  }
}

type MandateLike = { status: "REQUESTED" | "ASSIGNED" | "ACTIVE" | "CANCELLED"; updatedAt?: string | Date | null };

/**
 * Mandate phase. "En preparación" = assigned and the agent has already edited the listing after the assignment
 * (listing.updatedAt later than the mandate's last change); `listingUpdatedAt` is optional.
 */
export function mandatePhase(m: MandateLike, listingUpdatedAt?: string | Date | null): MandatePhase {
  if (m.status === "REQUESTED") return "REQUESTED";
  if (m.status === "ACTIVE") return "PUBLISHED";
  if (m.status === "CANCELLED") return "DECLINED";
  const t = (d?: string | Date | null) => (d ? new Date(d).getTime() : NaN);
  return t(listingUpdatedAt) > t(m.updatedAt) + 60_000 ? "PREPARING" : "ASSIGNED";
}

export const phaseLabel = (p: ListingPhase, locale: Locale) => (locale === "es" ? LISTING_PHASE[p].es : LISTING_PHASE[p].en);
export const phaseHint = (p: ListingPhase, locale: Locale) => (locale === "es" ? LISTING_PHASE[p].hint_es : LISTING_PHASE[p].hint_en);
export const mandateLabel = (p: MandatePhase, locale: Locale) => (locale === "es" ? MANDATE_PHASE[p].es : MANDATE_PHASE[p].en);
export const mandateHint = (p: MandatePhase, locale: Locale) => (locale === "es" ? MANDATE_PHASE[p].hint_es : MANDATE_PHASE[p].hint_en);

/** Listing statuses a manager can "Pausar" (hide) and the one "Activar" brings back. */
export const PAUSABLE: ListingStatus[] = ["ACTIVE", "COMING_SOON", "UNDER_OFFER"];
export const canPause = (l: ListingLike) => !l.takedownReason && PAUSABLE.includes(l.status);
export const canActivate = (l: ListingLike) => !l.takedownReason && l.status === "WITHDRAWN";

/** Plural forms for filter tabs ("Publicadas", "Pausadas"…). */
export const LISTING_PHASE_PLURAL: Record<ListingPhase, [string, string]> = {
  DRAFT: ["Borradores", "Drafts"],
  IN_REVIEW: ["En revisión", "In review"],
  REJECTED: ["Rechazadas", "Rejected"],
  COMING_SOON: ["Próximamente", "Coming soon"],
  PUBLISHED: ["Publicadas", "Published"],
  UNDER_OFFER: ["En oferta", "Under offer"],
  PAUSED: ["Pausadas", "Paused"],
  SOLD: ["Vendidas", "Sold"],
  RENTED: ["Alquiladas", "Rented"],
  EXPIRED: ["Vencidas", "Expired"],
  TAKEN_DOWN: ["Retiradas", "Taken down"],
};
