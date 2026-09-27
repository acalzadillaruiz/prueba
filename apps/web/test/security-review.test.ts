import { afterEach, describe, expect, it, vi } from "vitest";
import { UNTRUSTED_IP, clientIp } from "@/server/rate-limit";
import { uploadPath, UPLOAD_DIR } from "@/server/storage";

// Pure helpers: keep Auth.js / Prisma out of the unit test.
vi.mock("@/server/api", () => ({ ApiError: class extends Error {} }));
vi.mock("@newplace/db", () => ({ prisma: {} }));

const req = (headers: Record<string, string>) => new Request("http://localhost/api/v1/x", { headers });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("clientIp: spoofable platform headers are only trusted where the platform sets them", () => {
  it("off Vercel, a client-sent x-vercel-forwarded-for / x-real-ip does not change the key", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUSTED_IP_HEADER", "");
    const base = clientIp(req({ "x-forwarded-for": "203.0.113.50" }));
    // Exposed directly (no trusted header / proxy hops): X-Forwarded-For is client-controlled → shared bucket.
    expect(base).toBe(UNTRUSTED_IP);
    expect(clientIp(req({ "x-vercel-forwarded-for": "1.2.3.4", "x-forwarded-for": "203.0.113.50" }))).toBe(base);
    expect(clientIp(req({ "x-real-ip": "5.6.7.8", "x-forwarded-for": "203.0.113.50" }))).toBe(base);
  });
  it("on Vercel the edge-set header wins", () => {
    vi.stubEnv("VERCEL", "1");
    expect(clientIp(req({ "x-vercel-forwarded-for": "203.0.113.7", "x-forwarded-for": "6.6.6.6" }))).toBe("203.0.113.7");
    expect(clientIp(req({ "x-real-ip": "198.51.100.1", "x-forwarded-for": "6.6.6.6" }))).toBe("198.51.100.1");
  });
  it("an operator-named proxy header is used (and only that one)", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUSTED_IP_HEADER", "X-Real-IP");
    expect(clientIp(req({ "x-real-ip": "198.51.100.9", "x-vercel-forwarded-for": "1.1.1.1" }))).toBe("198.51.100.9");
  });
});

describe("uploadPath: /uploads can never read or write outside UPLOAD_DIR", () => {
  it("keeps normal keys inside the directory", () => {
    expect(uploadPath("listings/abc/x.jpg").startsWith(UPLOAD_DIR)).toBe(true);
    expect(uploadPath("/etc/passwd").startsWith(UPLOAD_DIR)).toBe(true); // absolute → re-rooted
  });
  it("rejects traversal and NUL bytes", () => {
    for (const k of ["..", "../package.json", "../../apps/web/.env.local", "listings/../../x", "a/../../..", "x\0.jpg"]) expect(() => uploadPath(k), k).toThrow();
  });
});

describe("email html: only clean app paths become a button", () => {
  async function sent(body: string) {
    vi.stubEnv("RESEND_API_KEY", "k");
    vi.stubEnv("EMAIL_FROM", "New Place <no-reply@example.com>");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://newplace.example");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { deliver } = await import("@/server/email");
    await deliver("a@example.com", "Asunto <b>", body);
    return JSON.parse((fetchMock.mock.calls[0] as unknown as [string, { body: string }])[1].body).html as string;
  }
  it("links invitations and alerts", async () => {
    expect(await sent("/es/register?invite=abc")).toContain('href="https://newplace.example/es/register?invite=abc"');
  });
  it("free text starting with / (an agent reply) stays escaped text", async () => {
    const h = await sent("/\t/evil.example <img src=x onerror=alert(1)>");
    expect(h).not.toContain("href=");
    expect(h).not.toContain("<img");
    expect(h).toContain("&lt;img");
    expect(h).toContain("Asunto &lt;b&gt;");
  });
});
