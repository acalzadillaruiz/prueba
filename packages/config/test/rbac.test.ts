import { describe, expect, it } from "vitest";
import { ROLES, can } from "../src/rbac";
import { leadSchema, registerSchema } from "../src/schemas";

describe("RBAC matrix (§6)", () => {
  it("every role can save searches", () => {
    for (const r of ROLES) expect(can(r, "search.save")).toBe(true);
  });
  it("only superadmin impersonates tenants", () => {
    expect(ROLES.filter((r) => can(r, "tenant.impersonate"))).toEqual(["SUPERADMIN"]);
  });
  it("agents only manage their own listings; seekers none", () => {
    expect(can("AGENT", "listing.crud")).toBe("own");
    expect(can("CAPTOR", "listing.crud")).toBe("capture");
    expect(can("SEEKER", "listing.crud")).toBe(false);
    expect(can("AGENT", "listing.assignAgent")).toBe(false);
  });
  it("FSBO publishing is for private owners", () => {
    expect(can("OWNER_PRIVATE", "fsbo.publish")).toBe(true);
    expect(can("AGENT", "fsbo.publish")).toBe(false);
  });
});

describe("shared schemas", () => {
  it("rejects short passwords and bad emails", () => {
    expect(registerSchema.safeParse({ name: "Ana", email: "ana@x.com", password: "123" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ana", email: "nope", password: "12345678" }).success).toBe(false);
  });
  it("accepts a valid lead", () => {
    const r = leadSchema.safeParse({ listingId: "l1", name: "Ana", email: "ana@x.com", message: "Hola" });
    expect(r.success).toBe(true);
  });
});
