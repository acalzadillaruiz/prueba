import { describe, expect, it, vi } from "vitest";
import { isCrossOrigin } from "@/server/api";
import { DEMO_LOGINS, isDemoEmail } from "@/lib/demo";

// isCrossOrigin is pure; keep Auth.js / Prisma out of the unit test.
vi.mock("@/auth", () => ({ auth: async () => null }));
vi.mock("@/server/identity", () => ({ liveIdentity: async () => null }));

const req = (method: string, headers: Record<string, string>) => new Request("http://localhost:3000/api/v1/leads", { method, headers });

describe("isCrossOrigin (CSRF defense-in-depth)", () => {
  it("blocks writes whose Origin names another host", () => {
    expect(isCrossOrigin(req("POST", { host: "localhost:3000", origin: "https://evil.example" }))).toBe(true);
    expect(isCrossOrigin(req("DELETE", { host: "localhost:3000", origin: "http://localhost:3001" }))).toBe(true);
    expect(isCrossOrigin(req("PATCH", { host: "localhost:3000", origin: "null" }))).toBe(true);
  });
  it("allows same-origin writes, missing Origin (server-to-server) and safe methods", () => {
    expect(isCrossOrigin(req("POST", { host: "localhost:3000", origin: "http://localhost:3000" }))).toBe(false);
    expect(isCrossOrigin(req("POST", { host: "localhost:3000", authorization: "Bearer x" }))).toBe(false);
    expect(isCrossOrigin(req("GET", { host: "localhost:3000", origin: "https://evil.example" }))).toBe(false);
  });
  it("uses the proxy's forwarded host", () => {
    expect(isCrossOrigin(req("POST", { host: "internal:3000", "x-forwarded-host": "newplace.app", origin: "https://newplace.app" }))).toBe(false);
  });
});

describe("isDemoEmail", () => {
  it("accepts only the seeded demo accounts", () => {
    for (const d of DEMO_LOGINS) expect(isDemoEmail(d.email.toUpperCase())).toBe(true);
    expect(isDemoEmail("andres@andesprime.ve")).toBe(false);
    expect(isDemoEmail("someone@gmail.com")).toBe(false);
    expect(isDemoEmail("")).toBe(false);
  });
});
