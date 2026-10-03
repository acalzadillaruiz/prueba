import { ImageResponse } from "next/og";
import { listingBySlug, servedPublicly } from "@/server/listings";
import { money, tx } from "@/lib/i18n";
import type { Locale } from "@/types/domain";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "New Place";

/** Share preview (WhatsApp, social): brand card with title, price and zone. Hidden listings get the plain brand card. */
export default async function OgImage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const found = await listingBySlug(slug);
  const l = found && (await servedPublicly(found)) ? found : null;
  const title = l ? tx(locale, l.title_es, l.title_en) : "New Place";
  const price = l ? money(l.priceAmount, locale, l.priceCurrency) : "";
  const where = l ? `${l.zone} · ${l.city}` : "";
  const facts = l ? [l.beds ? `${l.beds} ${tx(locale, "hab", "bd")}` : "", l.baths ? `${l.baths} ${tx(locale, "baños", "ba")}` : "", `${l.areaM2} m²`].filter(Boolean).join("  ·  ") : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: l?.luxury ? "#162638" : "#162638", color: "#F8F5EF", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: "#A8452A" }} />
          New Place
          {l?.luxury && <div style={{ marginLeft: 16, fontSize: 24, color: "#B4935A", border: "2px solid #B4935A", borderRadius: 999, padding: "4px 16px" }}>LUXURY</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 1050 }}>{title}</div>
          <div style={{ fontSize: 34, color: "#A9B4C2" }}>{where}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ fontSize: 60, fontWeight: 700, color: "#A8452A" }}>{price}</div>
          <div style={{ fontSize: 30, color: "#F8F5EF" }}>{facts}</div>
        </div>
      </div>
    ),
    size,
  );
}
