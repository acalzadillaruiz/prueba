import { afterEach, describe, expect, it } from "vitest";
import { gateCode, gateToken, safeNext } from "@/lib/site-gate";

describe("pre-launch access gate", () => {
  afterEach(() => {
    delete process.env.SITE_ACCESS_CODE;
  });

  it("is off unless SITE_ACCESS_CODE is set", () => {
    expect(gateCode()).toBe("");
    process.env.SITE_ACCESS_CODE = " 123456 ";
    expect(gateCode()).toBe("123456");
  });

  it("cookie token depends on the code and never contains it", async () => {
    process.env.SITE_ACCESS_CODE = "123456";
    const a = await gateToken();
    process.env.SITE_ACCESS_CODE = "654321";
    const b = await gateToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("123456");
  });

  it("only redirects to same-site paths after unlocking", () => {
    expect(safeNext("/es/search?type=SALE", "/es")).toBe("/es/search?type=SALE");
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "", null, undefined]) expect(safeNext(bad, "/es")).toBe("/es");
  });
});
