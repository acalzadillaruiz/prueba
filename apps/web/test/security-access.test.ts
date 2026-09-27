import { describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/server/api";

// A lead of Andes Prime whose stored agentId is a user of ANOTHER agency (e.g. set through a listing's agentId).
const lead = { id: "ld-x", agencyId: "ag-andes", agentId: "u-agent3", listingId: "l1" };
vi.mock("@newplace/db", () => ({ prisma: { lead: { findUnique: async () => lead } } }));
vi.mock("@/server/api", () => ({
  ApiError: class extends Error {
    constructor(public code: string) {
      super(code);
    }
  },
}));
vi.mock("@/server/listings", () => ({ publicWhere: () => ({}) }));

const { leadForUser } = await import("@/server/access");
const u = (id: string, role: SessionUser["role"], agencyId: string | null): SessionUser => ({ id, role, agencyId });
const code = (p: Promise<unknown>) => p.then(() => "OK").catch((e: { code?: string }) => e.code ?? "ERR");

describe("leadForUser: tenancy, not just agentId", () => {
  it("an agent of another agency named as agentId cannot open the lead", async () => {
    expect(await code(leadForUser("ld-x", u("u-agent3", "AGENT", "ag-night")))).toBe("FORBIDDEN");
  });
  it("the same agent while working for the lead's agency can", async () => {
    expect(await code(leadForUser("ld-x", u("u-agent3", "AGENT", "ag-andes")))).toBe("OK");
  });
  it("an agent whose agency was suspended (no agencyId) loses access", async () => {
    expect(await code(leadForUser("ld-x", u("u-agent3", "AGENT", null)))).toBe("FORBIDDEN");
  });
  it("managers of the lead's agency and the platform keep access", async () => {
    expect(await code(leadForUser("ld-x", u("u-owner", "AGENCY_OWNER", "ag-andes")))).toBe("OK");
    expect(await code(leadForUser("ld-x", u("u-super", "SUPERADMIN", null)))).toBe("OK");
    expect(await code(leadForUser("ld-x", u("u-owner2", "AGENCY_OWNER", "ag-night")))).toBe("FORBIDDEN");
  });
});
