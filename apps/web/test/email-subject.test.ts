import { describe, expect, it } from "vitest";
import { alertSubject, alertSubjectName, localizeEmailSubject } from "@/lib/emailSubject";

describe("alert email subjects: recipient's language, short money", () => {
  const s = { name: "Venta · Chacao · 2+ hab · ≤ USD 250.000", query: "type=SALE&zone=Chacao&beds=2&max=250000" };
  it("machine-made names read as the filters, in the recipient's language", () => {
    expect(alertSubjectName(s, "es")).toBe("Compra en Chacao · 2+ hab · hasta USD 250k");
    expect(alertSubjectName(s, "en")).toBe("Homes for sale in Chacao · 2+ bd · up to $250k");
    expect(alertSubjectName({ name: "Mi casa soñada", query: "max=250000" }, "en")).toBe("Mi casa soñada");
  });
  it("builds new subjects per locale", () => {
    expect(alertSubject.digest(3, "X", "es")).toBe("3 novedades en «X»");
    expect(alertSubject.digest(1, "X", "en")).toBe("1 new home in “X”");
    expect(alertSubject.price("Torre Alba", "en")).toBe("Now at a better price: Torre Alba");
    expect(alertSubject.fresh("X", "T", null)).toBe("Algo nuevo en «X»: T");
  });
  it("past subjects: raw «< 250.000 USD» reads short; on /en known phrasings read in English", () => {
    expect(localizeEmailSubject("3 nuevos en Chacao · 2+ hab · < 250.000 USD", "es")).toBe("3 nuevos en Chacao · 2+ hab · hasta USD 250k");
    expect(localizeEmailSubject("3 nuevos en Chacao · 2+ hab · < 250.000 USD", "en")).toBe("3 new in Chacao · 2+ bd · up to $250k");
    expect(localizeEmailSubject("3 novedades en «Compra en Chacao · 2+ hab · hasta USD 250k»", "en")).toBe("3 new homes in “Homes for sale in Chacao · 2+ bd · up to $250k”");
    expect(localizeEmailSubject("Bajó de precio: Ático luminoso en Los Palos Grandes (-4 %)", "en")).toBe("Price drop: Ático luminoso en Los Palos Grandes (-4%)");
    expect(localizeEmailSubject("Visita confirmada: Torre Alba, hoy 16:00", "en")).toBe("Viewing confirmed: Torre Alba, today 16:00");
    expect(localizeEmailSubject("Nuevos hoy en Altamira · alquiler", "en")).toBe("New today in Altamira · rental");
    expect(localizeEmailSubject("Algo raro", "en")).toBe("Algo raro");
  });
});
