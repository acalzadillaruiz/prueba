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
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#162638", color: "#F8F5EF", padding: 64, fontFamily: "serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* Brand roof mark: outer roof in Cal, inner "teja" in light terracotta. */}
          <svg width="96" height="34" viewBox="0 0 120 42">
            <path d="M6 37 60 7l54 30" fill="none" stroke="#F8F5EF" strokeWidth="6" />
            <path d="M30 38 60 21.5 90 38" fill="none" stroke="#E79A7F" strokeWidth="5" />
          </svg>
          <div style={{ fontSize: 30, letterSpacing: 8, color: "#F8F5EF" }}>NEW PLACE</div>
          {l?.luxury && <div style={{ marginLeft: 18, fontSize: 20, letterSpacing: 4, color: "#A8452A", background: "#FFFFFF", borderRadius: 999, padding: "6px 18px" }}>{tx(locale, "EXCLUSIVA", "EXCLUSIVE")}</div>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ width: 120, height: 2, background: "#B4935A" }} />
          <div style={{ fontSize: 66, lineHeight: 1.08, maxWidth: 1050 }}>{l ? title : tx(locale, "Pocas propiedades. Todas extraordinarias.", "Few properties. All extraordinary.")}</div>
          <div style={{ fontSize: 32, color: "#A9B4C2", fontFamily: "sans-serif" }}>{l ? where : tx(locale, "El Caribe, con alma mediterránea", "The Caribbean, with a Mediterranean soul")}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ fontSize: 64, color: "#F8F5EF" }}>{price}</div>
          <div style={{ fontSize: 28, color: "#D9C59C", fontFamily: "sans-serif" }}>{facts}</div>
        </div>
      </div>
    ),
    size,
  );
}
