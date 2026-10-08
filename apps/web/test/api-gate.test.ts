import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GATE_COOKIE, gatePassed, gateToken } from "@/lib/site-gate";
import { authConfig, staleDemo } from "@/auth.config";
import { demoUserId } from "@/server/demo-auth";

const req = (path: string, cookie?: string, method = "GET", accept = "application/json") =>
  new NextRequest(`http://localhost:3000${path}`, { method, headers: { accept, ...(cookie ? { cookie } : {}) } });

// next-intl's middleware only runs for page routes (never for /api); stub it so the module loads under Node ESM.
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response(null, { headers: { "x-intl": "1" } }) }));

// The middleware is an Auth.js wrapper: call it as Next does, (request, event).
type Mw = (req: NextRequest, ev: unknown) => Promise<Response>;
const run = async (r: NextRequest) => {
  const { default: middleware } = await import("@/middleware");
  return (middleware as unknown as Mw)(r, {});
};

describe("the preview gate covers /api (middleware)", () => {
  beforeEach(() => {
    process.env.SITE_ACCESS_CODE = "123456";
  });
  afterEach(() => {
    delete process.env.SITE_ACCESS_CODE;
  });

  it("answers API calls without the gate cookie with 401 JSON `site_locked`, never a redirect", async () => {
    for (const [p, method] of [
      ["/api/v1/listings?type=SALE", "GET"],
      ["/api/v1/fx", "GET"],
      ["/api/v1/platform/audit", "GET"],
      ["/api/auth/csrf", "GET"],
      ["/api/auth/callback/demo", "POST"],
      ["/api/v1/leads", "POST"],
    ]) {
      const res = await run(req(p, undefined, method));
      expect(res.status, p).toBe(401);
      expect(res.headers.get("location"), p).toBeNull();
      expect(res.headers.get("cache-control"), p).toBe("no-store");
      expect(((await res.json()) as { error: string }).error, p).toBe("site_locked");
    }
  });

  it("rejects a forged gate cookie", async () => {
    const res = await run(req("/api/v1/listings", `${GATE_COOKIE}=${"0".repeat(64)}`));
    expect(res.status).toBe(401);
  });

  it("lets API calls with the real gate cookie through", async () => {
    const res = await run(req("/api/v1/listings", `other=1; ${GATE_COOKIE}=${await gateToken()}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("keeps /api/access (the gate form) reachable, but nothing that merely starts like it", async () => {
    const ok = await run(req("/api/access", undefined, "POST"));
    expect(ok.headers.get("x-middleware-next")).toBe("1");
    expect((await run(req("/api/accessx", undefined, "POST"))).status).toBe(401);
  });

  it("sends a browser navigating to an API URL to the gate page instead of JSON", async () => {
    const res = await run(req("/api/v1/listings", undefined, "GET", "text/html"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/es/acceso");
  });

  it("is a no-op while SITE_ACCESS_CODE is unset", async () => {
    delete process.env.SITE_ACCESS_CODE;
    const res = await run(req("/api/v1/listings"));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});

describe("gatePassed (route-side check)", () => {
  afterEach(() => {
    delete process.env.SITE_ACCESS_CODE;
  });
  it("is true with the gate off, and with the gate on only for the real cookie", async () => {
    expect(await gatePassed(req("/api/auth/callback/demo"))).toBe(true);
    process.env.SITE_ACCESS_CODE = "123456";
    expect(await gatePassed(req("/api/auth/callback/demo"))).toBe(false);
    expect(await gatePassed(req("/api/auth/callback/demo", `${GATE_COOKIE}=forged`))).toBe(false);
    expect(await gatePassed(req("/api/auth/callback/demo", `a=b; ${GATE_COOKIE}=${await gateToken()}`))).toBe(true);
  });
});

describe("demo login needs the gate cookie while the gate is on", () => {
  afterEach(() => {
    delete process.env.SITE_ACCESS_CODE;
  });

  it("refuses the superadmin demo login without the cookie and allows it with it", async () => {
    process.env.SITE_ACCESS_CODE = "123456";
    const creds = { email: "superadmin@newplace.app" };
    expect(await demoUserId(creds, req("/api/auth/callback/demo", undefined, "POST"))).toBeNull();
    expect(await demoUserId(creds, req("/api/auth/callback/demo", `${GATE_COOKIE}=forged`, "POST"))).toBeNull();
    expect(await demoUserId(creds, req("/api/auth/callback/demo", `${GATE_COOKIE}=${await gateToken()}`, "POST"))).toEqual(expect.any(String));
  });

  it("still accepts only seeded demo accounts", async () => {
    expect(await demoUserId({ email: "someone@gmail.com" }, req("/api/auth/callback/demo"))).toBeNull();
    expect(await demoUserId({ email: " SEEKER@gmail.com " }, req("/api/auth/callback/demo"))).toEqual(expect.any(String));
  });
});

describe("a demo session stops working once DEMO_AUTH is off", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  const jwt = authConfig.callbacks.jwt as unknown as (p: Record<string, unknown>) => Record<string, unknown> | null;

  it("marks tokens minted by the demo provider, and only those", () => {
    vi.stubEnv("DEMO_AUTH", "true");
    const user = { id: "u1", role: "SUPERADMIN" };
    expect(jwt({ token: {}, user, account: { provider: "demo" } })?.demo).toBe(true);
    expect(jwt({ token: {}, user, account: { provider: "credentials" } })?.demo).toBeUndefined();
  });

  it("drops a demo token when DEMO_AUTH is off, keeps it while on, never touches other tokens", () => {
    const demo = { uid: "u1", role: "SUPERADMIN", demo: true };
    vi.stubEnv("DEMO_AUTH", "true");
    expect(staleDemo(demo)).toBe(false);
    expect(jwt({ token: { ...demo } })).not.toBeNull();
    vi.stubEnv("DEMO_AUTH", "");
    expect(staleDemo(demo)).toBe(true);
    expect(jwt({ token: { ...demo } })).toBeNull();
    expect(jwt({ token: { uid: "u2", role: "SEEKER" } })).not.toBeNull();
  });
});
