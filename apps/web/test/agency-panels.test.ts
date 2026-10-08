import { describe, expect, it } from "vitest";
import { LISTING_PHASE, MANDATE_PHASE, canActivate, canPause, listingPhase, mandateLabel, mandatePhase, phaseLabel } from "@/lib/lifecycle";
import { QUICK_REPLIES, fillReply } from "@/lib/quick-replies";
import { closingsByAgent, dashboardStats, deltaPct } from "@/server/agency-stats";
import { advisorPerformance } from "@/server/team-audit";

describe("lifecycle labels (one set for every view)", () => {
  it("listing phase: review wins while not approved, except drafts and paused listings", () => {
    expect(listingPhase({ status: "DRAFT", review: "PENDING" })).toBe("DRAFT");
    expect(listingPhase({ status: "ACTIVE", review: "PENDING" })).toBe("IN_REVIEW");
    expect(listingPhase({ status: "ACTIVE", review: "REJECTED" })).toBe("REJECTED");
    expect(listingPhase({ status: "ACTIVE", review: "APPROVED" })).toBe("PUBLISHED");
    expect(listingPhase({ status: "WITHDRAWN", review: "PENDING" })).toBe("PAUSED");
    expect(listingPhase({ status: "SOLD", review: "APPROVED" })).toBe("SOLD");
    expect(listingPhase({ status: "RENTED" })).toBe("RENTED");
    expect(listingPhase({ status: "EXPIRED" })).toBe("EXPIRED");
    expect(listingPhase({ status: "ACTIVE", review: "APPROVED", takedownReason: "fotos" })).toBe("TAKEN_DOWN");
    expect(phaseLabel("IN_REVIEW", "es")).toBe("En revisión");
    expect(phaseLabel("PUBLISHED", "es")).toBe("Publicada");
    expect(phaseLabel("PAUSED", "en")).toBe("Paused");
    // Every phase has both languages.
    for (const l of Object.values(LISTING_PHASE)) expect(l.es && l.en && l.hint_es && l.hint_en).toBeTruthy();
    for (const l of Object.values(MANDATE_PHASE)) expect(l.es && l.en).toBeTruthy();
  });
  it("mandate phase: Solicitado → Asignado → En preparación → Publicado / Rechazado", () => {
    const at = "2026-05-01T10:00:00Z";
    expect(mandatePhase({ status: "REQUESTED", updatedAt: at })).toBe("REQUESTED");
    expect(mandatePhase({ status: "ASSIGNED", updatedAt: at }, "2026-05-01T09:59:00Z")).toBe("ASSIGNED");
    expect(mandatePhase({ status: "ASSIGNED", updatedAt: at })).toBe("ASSIGNED");
    expect(mandatePhase({ status: "ASSIGNED", updatedAt: at }, "2026-05-02T10:00:00Z")).toBe("PREPARING");
    expect(mandatePhase({ status: "ACTIVE" })).toBe("PUBLISHED");
    expect(mandatePhase({ status: "CANCELLED" })).toBe("DECLINED");
    expect(mandateLabel("ASSIGNED", "es")).toBe("Asignado");
    expect(mandateLabel("PREPARING", "es")).toBe("En preparación");
  });
  it("pause / activate only where it makes sense (never over a moderation takedown)", () => {
    expect(canPause({ status: "ACTIVE" })).toBe(true);
    expect(canPause({ status: "DRAFT" })).toBe(false);
    expect(canPause({ status: "ACTIVE", takedownReason: "x" })).toBe(false);
    expect(canActivate({ status: "WITHDRAWN" })).toBe(true);
    expect(canActivate({ status: "SOLD" })).toBe(false);
  });
});

describe("KPI deltas", () => {
  it("no % against a tiny base (fewer than 5 in the previous period)", () => {
    expect(deltaPct(11, 1)).toBeNull();
    expect(deltaPct(3, 4)).toBeNull();
    expect(deltaPct(0, 0)).toBeNull();
    expect(deltaPct(10, 5)).toBe(100);
    expect(deltaPct(4, 8)).toBe(-50);
    expect(deltaPct(8, 8)).toBe(0);
  });
});

describe("quick replies", () => {
  it("3–5 templates in both languages, filled with the first name", () => {
    expect(QUICK_REPLIES.length).toBeGreaterThanOrEqual(3);
    expect(QUICK_REPLIES.length).toBeLessThanOrEqual(5);
    for (const r of QUICK_REPLIES) expect(r.es.includes("{nombre}") && r.en.includes("{nombre}")).toBe(true);
    expect(fillReply(QUICK_REPLIES[0].es, "María José Pérez")).toBe("¡Hola María! Gracias por escribir. ¿Te viene bien una visita esta semana?");
    expect(fillReply("¡Hola {nombre}! ¿Seguimos?", "")).toBe("¡Hola! ¿Seguimos?");
    expect(fillReply("¡Gracias, {nombre}! Listo.", " ")).toBe("¡Gracias! Listo.");
  });
});

describe("closings: one definition for dashboard, audit and reports (seeded DB)", () => {
  it("dashboard ranking and Auditoría count the same closings over the same 30 days", async () => {
    const now = Date.now();
    const since = new Date(now - 30 * 864e5);
    const [closed, audit, dash] = await Promise.all([closingsByAgent("ag-andes", since, new Date(now)), advisorPerformance("ag-andes", 30, now), dashboardStats("ag-andes")]);
    for (const r of dash.ranking) {
      expect(r.won).toBe(closed.get(r.id)?.count ?? 0);
      expect(r.gmv).toBe(closed.get(r.id)?.volume ?? 0);
      const a = audit.find((x) => x.id === r.id);
      if (a) expect(a.closings).toBe(r.won);
    }
    // An agent's own dashboard shows the same figure as the agency-wide ranking.
    const someone = dash.ranking[0];
    if (someone) expect((await dashboardStats("ag-andes", someone.id)).ranking[0]?.won).toBe(someone.won);
  });
  it("a closing outside the period is not counted", async () => {
    const future = new Date(Date.now() + 365 * 864e5);
    expect((await closingsByAgent("ag-andes", future, new Date(future.getTime() + 864e5))).size).toBe(0);
  });
});
