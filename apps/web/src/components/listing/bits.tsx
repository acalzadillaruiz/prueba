"use client";

import { useState } from "react";
import { Check, Heart, Scale, Share2 } from "lucide-react";
import type { ListingStatus, Locale } from "@/types/domain";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, ago, lbl, tx } from "@/lib/i18n";

export function SaveButton({ id, className, locale }: { id: string; className?: string; locale: Locale }) {
  const { saved, toggleSaved } = useApp();
  const on = saved.includes(id);
  return (
    <button
      aria-label={on ? tx(locale, "Quitar de guardados", "Remove from saved") : tx(locale, "Guardar", "Save")}
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(id);
      }}
      className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-transform duration-np hover:scale-105", className)}
    >
      <Heart size={18} aria-hidden className={on ? "fill-coral text-coral" : "text-navy"} />
    </button>
  );
}

export function CompareButton({ id, locale, dark }: { id: string; locale: Locale; dark?: boolean }) {
  const { compare, toggleCompare } = useApp();
  const on = compare.includes(id);
  const [full, setFull] = useState(false);
  return (
    <button
      aria-pressed={on}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!toggleCompare(id)) {
          setFull(true);
          window.setTimeout(() => setFull(false), 2500);
        }
      }}
      className={cn(
        // after: invisible 44 px hit area around the compact pill (tap target) without changing the card layout
        "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-np after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']",
        on ? "border-navy bg-navy text-ivory" : dark ? "border-white/20 text-ivory" : "border-line bg-white text-ink/70 hover:border-navy/40",
      )}
    >
      <Scale size={13} /> <span aria-live="polite">{full ? tx(locale, "Máximo 3: quita uno", "Max 3: remove one") : on ? tx(locale, "Comparando", "Comparing") : tx(locale, "Comparar", "Compare")}</span>
    </button>
  );
}

const STATUS_TONE: Record<ListingStatus, string> = {
  DRAFT: "bg-black/60 text-white",
  COMING_SOON: "bg-[#4F6285] text-white",
  ACTIVE: "bg-ok text-white",
  UNDER_OFFER: "bg-[#8A5A00] text-white",
  SOLD: "bg-navy text-ivory",
  RENTED: "bg-navy text-ivory",
  WITHDRAWN: "bg-danger text-white",
  EXPIRED: "bg-black/50 text-white",
};

/**
 * Listing status pill. Pass `review` where staff/owners see it: a published status still waiting for moderation
 * (PENDING) or rejected isn't live, so it reads "En revisión" / "Rechazado" instead of "Activo".
 */
export function StatusBadge({ status, locale, className, review }: { status: ListingStatus; locale: Locale; className?: string; review?: "PENDING" | "APPROVED" | "REJECTED" }) {
  if (review && review !== "APPROVED" && status !== "DRAFT" && status !== "WITHDRAWN") {
    return (
      <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", review === "PENDING" ? "bg-[#8A5A00] text-white" : "bg-danger text-white", className)}>
        {review === "PENDING" ? tx(locale, "En revisión", "In review") : tx(locale, "Rechazado", "Rejected")}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", STATUS_TONE[status], className)}>
      {lbl(STATUS_LABEL[status], locale)}
    </span>
  );
}

export function Freshness({ iso, locale, className }: { iso: string; locale: Locale; className?: string }) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      {/* Relative time differs between the cached server HTML and the browser: not a hydration error. */}
      <span className={cn("relative h-2 w-2 rounded-full", minutes < 60 ? "np-pulse bg-coral" : "bg-mist")} suppressHydrationWarning />
      <span>
        {tx(locale, "Actualizado", "Updated")}{" "}
        <time dateTime={iso} suppressHydrationWarning>
          {ago(iso, locale)}
        </time>
      </span>
    </span>
  );
}

/** Web Share API on phones; copies the link elsewhere. */
export function ShareButton({ locale, title, className }: { locale: Locale; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <button type="button" onClick={share} className={className} aria-live="polite">
      {copied ? <Check size={13} aria-hidden /> : <Share2 size={13} aria-hidden />} {copied ? tx(locale, "Enlace copiado", "Link copied") : tx(locale, "Compartir", "Share")}
    </button>
  );
}
