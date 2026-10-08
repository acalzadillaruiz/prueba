import { describe, expect, it } from "vitest";
import { heuristicLeadScore, heuristicSearchParse, splitUnderstood } from "../src/heuristic";
import { closestPlaces, queryUnderstood, suggestPlaces } from "../src/zones";

describe("heuristicSearchParse", () => {
  it("parses the reference query", () => {
    const q = heuristicSearchParse("ático con luz en Los Palos Grandes por menos de 180 mil");
    expect(q.zone).toBe("Los Palos Grandes");
    expect(q.maxPrice).toBe(180000);
    expect(q.propertyKind).toBe("penthouse");
    expect(q.keywords).toContain("light");
  });
  it("parses beds and rent", () => {
    const q = heuristicSearchParse("alquiler 2 habitaciones en Chacao hasta 900");
    expect(q.listingType).toBe("LONG_RENT");
    expect(q.minBeds).toBe(2);
    expect(q.maxPrice).toBe(900);
  });
});

describe("heuristicLeadScore", () => {
  it("tour request -> PROPOSE_TOUR", () => {
    const r = heuristicLeadScore({ createdMinutesAgo: 3, listingPrice: 200000, budget: 210000, source: "TOUR_REQUEST", messages: 1, hasPhone: true, toursRequested: 1 });
    expect(r.nextAction).toBe("PROPOSE_TOUR");
    expect(r.score).toBeGreaterThan(80);
  });
});

describe("searchParse · real phrases (2035 review)", () => {
  it("reads «million» in English instead of a USD 1 cap", () => {
    const q = heuristicSearchParse("penthouse with sea view in Lecheria under 1 million");
    expect(q.maxPrice).toBe(1_000_000);
    expect(q.zone).toBe("Lechería");
    expect(q.keywords).toContain("sea");
  });
  it("reads 1.2M, 400k and 400 mil", () => {
    expect(heuristicSearchParse("house up to 1.2m").maxPrice).toBe(1_200_000);
    expect(heuristicSearchParse("apartment under 400k").maxPrice).toBe(400_000);
    expect(heuristicSearchParse("ático hasta 400 mil").maxPrice).toBe(400_000);
  });
  it("never applies a sale price under USD 1.000", () => {
    expect(heuristicSearchParse("casa hasta 5").maxPrice).toBeUndefined();
    expect(heuristicSearchParse("alquiler hasta 800").maxPrice).toBe(800);
  });
  it("recognises El Morro and holiday rentals", () => {
    expect(heuristicSearchParse("casa con piscina en El Morro").zone).toBe("El Morro");
    expect(heuristicSearchParse("A holiday villa in Margarita")).toMatchObject({ listingType: "SHORT_RENT", zone: "Isla de Margarita" });
  });
});

describe("zones · partial names and typeahead", () => {
  it("reads a half-typed place, accent-insensitive", () => {
    expect(heuristicSearchParse("Lech").zone).toBe("Lechería");
    expect(heuristicSearchParse("casa en lecher").zone).toBe("Lechería");
    expect(heuristicSearchParse("apartamento en marg").zone).toBe("Isla de Margarita");
    expect(heuristicSearchParse("algo en el hati").zone).toBe("El Hatillo");
  });
  it("never turns ordinary words into a zone", () => {
    expect(heuristicSearchParse("casa en la playa").zone).toBeUndefined();
    expect(heuristicSearchParse("una casa que vale la pena").zone).toBeUndefined();
    expect(heuristicSearchParse("casa en la costa").zone).toBeUndefined();
  });
  it("flags text it did not understand", () => {
    expect(queryUnderstood(heuristicSearchParse("xyzzy castillo"))).toBe(false);
    expect(queryUnderstood(heuristicSearchParse("Lech"))).toBe(true);
    expect(queryUnderstood(heuristicSearchParse("con piscina"))).toBe(true);
    expect(queryUnderstood(heuristicSearchParse(""))).toBe(false);
  });
  it("suggests places for the end of the text", () => {
    expect(suggestPlaces("Lech").map((s) => s.name)).toEqual(["Lechería"]);
    const s = suggestPlaces("casa en lech")[0];
    expect(s).toMatchObject({ name: "Lechería", replace: "lech" });
    expect(suggestPlaces("morro").map((s) => s.name)).toEqual(expect.arrayContaining(["El Morro", "Cerro El Morro", "Canales de El Morro"]));
    expect(suggestPlaces("el mo").map((s) => s.name)).toContain("El Morro");
    expect(suggestPlaces("san rom")[0]).toMatchObject({ name: "Lomas de San Román", replace: "san rom" });
  });
  it("does not re-offer a place already written in full, nor suggest from one letter", () => {
    expect(suggestPlaces("Chacao").map((s) => s.name)).not.toContain("Chacao");
    expect(suggestPlaces("c")).toEqual([]);
    expect(suggestPlaces("xyzzy")).toEqual([]);
  });
  it("works with the inventory's own list", () => {
    const places = [{ name: "Caracas" }, { name: "Altamira", city: "Caracas" }];
    expect(suggestPlaces("alt", places)).toEqual([{ name: "Altamira", city: "Caracas", replace: "alt" }]);
  });
  it("finds places close to a typo", () => {
    expect(closestPlaces("Lecheira").map((p) => p.name)).toContain("Lechería");
    expect(closestPlaces("chaco").map((p) => p.name)).toContain("Chacao");
    expect(closestPlaces("xyzzy castillo")).toEqual([]);
  });
});

describe("searchParse · furnished", () => {
  it("maps amoblado / amueblado / amueblada / furnished to the furnished keyword", () => {
    for (const t of ["apartamento amoblado en Chacao", "casa amueblada", "estudio Amueblado", "furnished flat in Altamira", "apartamentos amoblados"]) {
      expect(heuristicSearchParse(t).keywords, t).toContain("furnished");
    }
  });
  it("leaves «unfurnished» and «sin amoblar» alone, and counts the word as understood", () => {
    expect(heuristicSearchParse("unfurnished apartment").keywords).not.toContain("furnished");
    expect(heuristicSearchParse("apartamento sin amoblar").keywords).not.toContain("furnished");
    expect(splitUnderstood("apartamento amoblado en Chacao")).toEqual({ understood: ["apartamento", "amoblado", "Chacao"], unknown: [] });
  });
});

describe("splitUnderstood · mixed queries", () => {
  it("separates the understood words from the ignored ones", () => {
    expect(splitUnderstood("zzqx casa rara")).toEqual({ understood: ["casa"], unknown: ["zzqx", "rara"] });
  });
  it("keeps prices, rooms, places and connectors out of the unknown list", () => {
    expect(splitUnderstood("apartamento de 2 habitaciones en Lechería por menos de 200 mil")).toEqual({
      understood: ["apartamento", "2", "habitaciones", "Lechería", "menos", "de", "200", "mil"],
      unknown: [],
    });
    expect(splitUnderstood("casa frente al mar, en Lech").unknown).toEqual([]);
    expect(splitUnderstood("A house with a pool").unknown).toEqual([]);
  });
  it("reports everything when nothing is understood", () => {
    expect(splitUnderstood("xyzzy castillo")).toEqual({ understood: [], unknown: ["xyzzy", "castillo"] });
    expect(splitUnderstood("   ")).toEqual({ understood: [], unknown: [] });
  });
});
