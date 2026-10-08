import { describe, expect, it } from "vitest";
import { canonicalQueryUrl } from "@/components/search/queryParams";

const canon = (qs: string) => canonicalQueryUrl(new URLSearchParams(qs))?.toString() ?? null;

describe("canonicalQueryUrl (?q= links)", () => {
  it("turns the words into filters and keeps only the words it didn't understand in q", () => {
    const p = new URLSearchParams(canon("q=casa en lechería con helipuerto")!);
    expect(p.get("zone")).toBe("Lechería");
    expect(p.get("kind")).toBe("house");
    expect(p.get("type")).toBe("SALE");
    expect(p.get("q")).toBe("helipuerto");
    // Everything understood: the words are all chips now, no q left.
    expect(new URLSearchParams(canon("q=casa en lechería con piscina")!).get("q")).toBeNull();
    // A type alone ("alquiler") is understood; the rest stays in q.
    const r = new URLSearchParams(canon("type=SALE&q=alquiler zzqx")!);
    expect(r.get("type")).toBe("LONG_RENT");
    expect(r.get("q")).toBe("zzqx");
    expect(canon(r.toString())).toBeNull();
  });
  it("keeps the current type, sort and view; the parsed type wins", () => {
    const p = new URLSearchParams(canon("type=LONG_RENT&sort=price-asc&view=map&q=apartamento en chacao")!);
    expect(p.get("type")).toBe("LONG_RENT");
    expect(p.get("kind")).toBe("apartment");
    expect(p.get("sort")).toBe("price-asc");
    expect(p.get("view")).toBe("map");
    expect(new URLSearchParams(canon("type=SALE&q=alquiler en caracas")!).get("type")).toBe("LONG_RENT");
  });
  it("maps «amoblado» / «furnished» to the Furnished filter", () => {
    const p = new URLSearchParams(canon("q=apartamento amoblado en chacao")!);
    expect(p.get("furnished")).toBe("1");
    expect(p.get("kind")).toBe("apartment");
    expect(new URLSearchParams(canon("q=amueblada")!).get("furnished")).toBe("1");
    expect(new URLSearchParams(canon("type=LONG_RENT&q=furnished flat")!).get("furnished")).toBe("1");
    expect(canon("q=apartamento sin amoblar")).not.toContain("furnished");
  });
  it("never redirects a canonical URL, words it can't read or an empty q", () => {
    expect(canon("type=SALE&kind=house&q=zzqx casa rara")).toBeNull();
    expect(canon("type=SALE&q=xyzzy castillo")).toBeNull();
    expect(canon("type=SALE&q=")).toBeNull();
    expect(canon("type=SALE")).toBeNull();
    // the canonical URL itself is stable
    const once = canon("q=casa en lechería con piscina hasta 500 mil")!;
    expect(canon(once)).toBeNull();
  });
});
