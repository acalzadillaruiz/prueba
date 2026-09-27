import { afterEach, describe, expect, it, vi } from "vitest";
import { UNTRUSTED_IP, clientIp } from "@/server/rate-limit";

// clientIp is pure; keep Auth.js / Prisma (pulled in via api.ts and @newplace/db) out of the unit test.
vi.mock("@/server/api", () => ({ ApiError: class extends Error {} }));
vi.mock("@newplace/db", () => ({ prisma: {} }));

const req = (headers: Record<string, string>) => new Request("http://localhost/api/v1/x", { headers });

afterEach(() => vi.unstubAllEnvs());

describe("clientIp — exposed directly (no trusted header, not Vercel, no proxy hops)", () => {
  it("never trusts client-controlled X-Forwarded-For / platform headers: rotating them keeps one bucket", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUSTED_IP_HEADER", "");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    const a = clientIp(req({ "x-forwarded-for": "1.2.3.4" }));
    const b = clientIp(req({ "x-forwarded-for": "9.9.9.9, 203.0.113.50" }));
    const c = clientIp(req({ "x-vercel-forwarded-for": "5.5.5.5", "x-real-ip": "6.6.6.6" }));
    expect([a, b, c]).toEqual([UNTRUSTED_IP, UNTRUSTED_IP, UNTRUSTED_IP]);
    expect(clientIp(req({}))).toBe(UNTRUSTED_IP);
  });
});

describe("clientIp — on Vercel", () => {
  it("uses the edge header (one bucket per real client, users aren't pooled)", () => {
    vi.stubEnv("VERCEL", "1");
    expect(clientIp(req({ "x-vercel-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.1", "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(req({ "x-real-ip": "198.51.100.1" }))).toBe("198.51.100.1");
  });
});

describe("clientIp — operator-configured", () => {
  it("TRUSTED_IP_HEADER wins", () => {
    vi.stubEnv("TRUSTED_IP_HEADER", "cf-connecting-ip");
    expect(clientIp(req({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "6.6.6.6" }))).toBe("203.0.113.9");
  });
  it("TRUSTED_PROXY_HOPS=1 takes the right-most X-Forwarded-For entry; spoofed left entries don't change the key", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 10.0.0.9, 203.0.113.50" }))).toBe("203.0.113.50");
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.50" }))).toBe(clientIp(req({ "x-forwarded-for": "9.9.9.9, 203.0.113.50" })));
    expect(clientIp(req({ "x-forwarded-for": " , 203.0.113.50 , " }))).toBe("203.0.113.50");
  });
  it("TRUSTED_PROXY_HOPS=2 skips the inner proxy; too few entries → shared bucket", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.50, 10.0.0.2" }))).toBe("203.0.113.50");
    expect(clientIp(req({ "x-forwarded-for": "10.0.0.2" }))).toBe(UNTRUSTED_IP);
  });
});
