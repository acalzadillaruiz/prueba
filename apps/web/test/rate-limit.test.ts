import { describe, expect, it, vi } from "vitest";
import { clientIp } from "@/server/rate-limit";

// clientIp is pure; keep Auth.js / Prisma (pulled in via api.ts and @newplace/db) out of the unit test.
vi.mock("@/server/api", () => ({ ApiError: class extends Error {} }));
vi.mock("@newplace/db", () => ({ prisma: {} }));

const req = (headers: Record<string, string>) => new Request("http://localhost/api/v1/x", { headers });

describe("clientIp", () => {
  it("prefers the platform header over everything else", () => {
    expect(clientIp(req({ "x-vercel-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.1", "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe("203.0.113.7");
  });
  it("falls back to x-real-ip", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.1", "x-forwarded-for": "6.6.6.6, 198.51.100.1" }))).toBe("198.51.100.1");
  });
  it("uses the LAST x-forwarded-for hop, never the client-supplied first entry", () => {
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 10.0.0.9, 203.0.113.50" }))).toBe("203.0.113.50");
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.50" }))).toBe("203.0.113.50");
  });
  it("a spoofed first entry does not change the key", () => {
    const a = clientIp(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.50" }));
    const b = clientIp(req({ "x-forwarded-for": "9.9.9.9, 203.0.113.50" }));
    expect(a).toBe(b);
  });
  it("ignores empty hops and defaults to local", () => {
    expect(clientIp(req({ "x-forwarded-for": " , 203.0.113.50 , " }))).toBe("203.0.113.50");
    expect(clientIp(req({}))).toBe("local");
  });
});
