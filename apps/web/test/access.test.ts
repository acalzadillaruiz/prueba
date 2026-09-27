import { describe, expect, it } from "vitest";
import { leadForUser, listingForUser, visibleListingId } from "@/server/access";
import type { SessionUser } from "@/server/api";

// Seed (packages/db/prisma/seed-data): listing 19if9a belongs to Andes Prime (ag-andes), agent u-agent.
const u = (id: string, role: SessionUser["role"], agencyId: string | null): SessionUser => ({ id, role, agencyId });
const agent = u("u-agent", "AGENT", "ag-andes");
const otherAgent = u("u-agent2", "AGENT", "ag-andes");
const owner = u("u-owner", "AGENCY_OWNER", "ag-andes");
const back = u("u-back", "BACKOFFICE", "ag-andes");
const captor = u("u-captor", "CAPTOR", "ag-andes");
const photo = u("u-photo", "PHOTOGRAPHER", "ag-andes");
const foreignOwner = u("u-owner2", "AGENCY_OWNER", "ag-night");
const seeker = u("u-seeker", "SEEKER", null);
const superadmin = u("u-super", "SUPERADMIN", null);

const code = async (p: Promise<unknown>) => p.then(() => "OK").catch((e: { code?: string }) => e.code ?? "ERR");

describe("listingForUser (RBAC + tenant isolation)", () => {
  it("assigned agent edits; other agents of the same agency don't", async () => {
    expect(await code(listingForUser("19if9a", agent, "edit"))).toBe("OK");
    expect(await code(listingForUser("19if9a", otherAgent, "edit"))).toBe("FORBIDDEN");
  });
  it("managers of the agency can approve and assign; agents can't", async () => {
    expect(await code(listingForUser("19if9a", owner, "approve"))).toBe("OK");
    expect(await code(listingForUser("19if9a", back, "assign"))).toBe("OK");
    expect(await code(listingForUser("19if9a", agent, "approve"))).toBe("FORBIDDEN");
  });
  it("captor views, photographer uploads photos, neither edits", async () => {
    expect(await code(listingForUser("19if9a", captor, "view"))).toBe("OK");
    expect(await code(listingForUser("19if9a", captor, "edit"))).toBe("FORBIDDEN");
    expect(await code(listingForUser("19if9a", photo, "photos"))).toBe("OK");
    expect(await code(listingForUser("19if9a", photo, "edit"))).toBe("FORBIDDEN");
  });
  it("another agency and seekers are isolated; superadmin sees all; unknown ids are 404", async () => {
    expect(await code(listingForUser("19if9a", foreignOwner, "view"))).toBe("FORBIDDEN");
    expect(await code(listingForUser("19if9a", seeker, "view"))).toBe("FORBIDDEN");
    expect(await code(listingForUser("19if9a", superadmin, "edit"))).toBe("OK");
    expect(await code(listingForUser("does-not-exist", superadmin, "view"))).toBe("NOT_FOUND");
  });
  it("published listings are visible to anyone; unknown ones are 404", async () => {
    expect(await code(visibleListingId("19if9a", null))).toBe("OK");
    expect(await code(visibleListingId("does-not-exist", null))).toBe("NOT_FOUND");
  });
});

describe("leadForUser", () => {
  it("another agency cannot open a lead; the agency manager can", async () => {
    expect(await code(leadForUser("ld-01", foreignOwner))).toBe("FORBIDDEN");
    expect(await code(leadForUser("ld-01", owner))).toBe("OK");
  });
});
