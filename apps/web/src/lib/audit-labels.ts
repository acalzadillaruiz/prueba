import type { Locale } from "@/types/domain";

/** Human labels for audit actions (AuditLog.action). Unknown actions fall back to their prefix, then to the raw code. */
const ACTIONS: Record<string, [string, string]> = {
  "agency.branding": ["Marca de agencia actualizada", "Agency branding updated"],
  "auth.password.reset": ["Contraseña restablecida por email", "Password reset by email"],
  "agency.create": ["Agencia creada", "Agency created"],
  "agency.oncall": ["Guardia 24/7 actualizada", "On-call rota updated"],
  "agency.flags": ["Agencia: estado o plan cambiado", "Agency: status or plan changed"],
  "agency.update": ["Agencia editada (nombre / ciudad)", "Agency edited (name / city)"],
  "ai.provider": ["Proveedor de IA cambiado", "AI provider changed"],
  "capture.create": ["Captación registrada", "Capture logged"],
  "capture.duplicate": ["Captación duplicada", "Duplicate capture"],
  "capture.result": ["Resultado de captación", "Capture result"],
  "chat.audit.view": ["Chat del equipo consultado (solo lectura)", "Team chat viewed (read-only)"],
  "capture.convert": ["Captación convertida en inmueble", "Capture converted to listing"],
  "commission.rule": ["Regla de comisión", "Commission rule"],
  "fx.update": ["Tasa de cambio actualizada", "FX rate updated"],
  "lead.stage": ["Etapa del lead", "Lead stage"],
  "lead.tour": ["Visita agendada", "Tour booked"],
  "lead.assign": ["Lead reasignado", "Lead reassigned"],
  "listing.approve": ["Inmueble aprobado", "Listing approved"],
  "listing.assign": ["Inmueble asignado", "Listing assigned"],
  "listing.create.fsbo": ["Inmueble publicado por su dueño", "Listing created by owner"],
  "listing.create.agency": ["Inmueble creado por la agencia", "Listing created by agency"],
  "listing.create.mandate": ["Mandato solicitado", "Mandate requested"],
  "listing.review.approved": ["Inmueble aprobado", "Listing approved"],
  "listing.review.rejected": ["Inmueble rechazado", "Listing rejected"],
  "listing.review.pending": ["Inmueble enviado a revisión", "Listing sent to review"],
  "listing.update": ["Inmueble editado", "Listing edited"],
  "listing.withdraw": ["Inmueble retirado", "Listing withdrawn"],
  "listing.takedown": ["Inmueble retirado por moderación", "Listing taken down"],
  "listing.restore": ["Inmueble restaurado", "Listing restored"],
  "listing.delete": ["Inmueble borrado por su dueño", "Listing deleted by owner"],
  "listing.appeal": ["Dueño pidió revisar un retiro", "Owner appealed a takedown"],
  "mandate.update": ["Mandato actualizado", "Mandate updated"],
  "media.create": ["Sesión de fotos creada", "Photo shoot created"],
  "media.status": ["Estado de sesión de fotos", "Photo shoot status"],
  "media.assign": ["Sesión de fotos reasignada", "Photo shoot reassigned"],
  "media.checklist": ["Checklist de fotos", "Photo checklist"],
  "member.update": ["Miembro del equipo actualizado", "Team member updated"],
  "moderation.resolve": ["Reporte de moderación resuelto", "Moderation report resolved"],
  "seed.recompute_estimates": ["Estimaciones recalculadas", "Estimates recomputed"],
  "team.invite": ["Invitación enviada", "Invitation sent"],
  "team.invite.accept": ["Invitación aceptada", "Invitation accepted"],
  "team.invite.revoke": ["Invitación revocada", "Invitation revoked"],
  "tour.status": ["Estado de visita", "Tour status"],
  "tenant.impersonate": ["Entró como agencia", "Impersonated agency"],
  "tenant.impersonate.exit": ["Salió de la agencia", "Stopped impersonating"],
  "user.role": ["Rol de usuario cambiado", "User role changed"],
  "user.suspend": ["Usuario suspendido", "User suspended"],
  "user.restore": ["Usuario reactivado", "User restored"],
};

/** Action families for the audit filter (first segment of the code). */
export const AUDIT_PREFIXES: Record<string, [string, string]> = {
  agency: ["Agencias", "Agencies"],
  ai: ["IA", "AI"],
  capture: ["Captación", "Capture"],
  chat: ["Chats del equipo", "Team chats"],
  commission: ["Comisiones", "Commissions"],
  fx: ["Tasas de cambio", "FX"],
  lead: ["Leads", "Leads"],
  listing: ["Inmuebles", "Listings"],
  mandate: ["Mandatos", "Mandates"],
  media: ["Fotografía", "Media"],
  member: ["Equipo", "Team"],
  moderation: ["Moderación", "Moderation"],
  seed: ["Datos", "Data"],
  team: ["Invitaciones", "Invitations"],
  tenant: ["Impersonación", "Impersonation"],
  tour: ["Visitas", "Tours"],
  user: ["Usuarios", "Users"],
};

export function auditLabel(action: string, locale: Locale): string {
  const pick = (v: [string, string]) => (locale === "es" ? v[0] : v[1]);
  if (ACTIONS[action]) return pick(ACTIONS[action]);
  // "listing.create.xyz" → "listing.create" …
  const parts = action.split(".");
  for (let i = parts.length - 1; i > 0; i--) {
    const k = parts.slice(0, i).join(".");
    if (ACTIONS[k]) return pick(ACTIONS[k]);
  }
  const fam = AUDIT_PREFIXES[parts[0]];
  return fam ? `${pick(fam)} · ${parts.slice(1).join(".") || action}` : action;
}

/** Enum values that appear in audit details (from → to). */
const VALUES: Record<string, [string, string]> = {
  NEW: ["Nuevo", "New"], CONTACTED: ["Contactado", "Contacted"], TOUR: ["Visita", "Tour"], OFFER: ["Oferta", "Offer"], WON: ["Ganado", "Won"], LOST: ["Perdido", "Lost"],
  PENDING: ["Pendiente", "Pending"], CAPTURED: ["Captado", "Captured"], REJECTED: ["Rechazado", "Rejected"], DUPLICATE: ["Duplicado", "Duplicate"],
  SCHEDULED: ["Programada", "Scheduled"], SHOOTING: ["En sesión", "Shooting"], UPLOADING: ["Subiendo fotos", "Uploading"], DELIVERED: ["Entregada", "Delivered"],
  SUPERADMIN: ["Superadmin", "Superadmin"], AGENCY_OWNER: ["Dueño de agencia", "Agency owner"], AGENT: ["Agente", "Agent"], CAPTOR: ["Captador", "Captor"], PHOTOGRAPHER: ["Fotógrafo", "Photographer"], BACKOFFICE: ["Backoffice", "Backoffice"], OWNER_PRIVATE: ["Propietario", "Owner"], SEEKER: ["Buscador", "Seeker"],
  REQUESTED: ["Solicitado", "Requested"], ASSIGNED: ["Asignado", "Assigned"], CANCELLED: ["Cancelado", "Cancelled"], CONFIRMED: ["Confirmada", "Confirmed"], DONE: ["Realizada", "Done"],
  ACTIVE: ["Activa", "Active"], TRIAL: ["En prueba", "Trial"], SUSPENDED: ["Suspendida", "Suspended"],
};

export const valueLabel = (v: unknown, locale: Locale) => (typeof v === "string" && VALUES[v] ? VALUES[v][locale === "es" ? 0 : 1] : String(v ?? "—"));

/** Short human summary of an audit entry's data ("Nuevo → Contactado"), or "" when there is nothing useful. */
export function auditDetail(data: Record<string, unknown> | null, locale: Locale): string {
  if (!data) return "";
  if ("from" in data || "to" in data) return `${valueLabel(data.from, locale)} → ${valueLabel(data.to, locale)}${data.auto ? " (auto)" : ""}`;
  return Object.entries(data)
    .filter(([k, v]) => v !== undefined && v !== null && !/id$/i.test(k) && typeof v !== "object")
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === "boolean" ? (v ? (locale === "es" ? "sí" : "yes") : "no") : valueLabel(v, locale)}`)
    .join(" · ");
}
