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
      className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-[#ffffffe6] text-[#1C1D1D] shadow-sm backdrop-blur transition-transform duration-np hover:scale-105", className)}
    >
      <Heart size={18} strokeWidth={1.7} aria-hidden className={on ? "fill-[#1F4E5A] text-[#1F4E5A]" : "text-[#1C1D1D]"} />
    </button>
  );
}

export function CompareButton({ id, locale, dark, className }: { id: string; locale: Locale; dark?: boolean; className?: string }) {
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
        on ? "np-sel border-2" : dark ? "border-white/20 text-ivory" : "border-line bg-white text-ink/70 hover:border-navy/40",
        className,
      )}
    >
      <Scale size={13} /> <span aria-live="polite">{full ? tx(locale, "Máx. 3: quita una", "Max 3: remove one") : on ? tx(locale, "Comparando", "Comparing") : tx(locale, "Comparar", "Compare")}</span>
    </button>
  );
}

/**
 * Compare toggle on a listing card's photo (search results). Touch screens: a round icon button next to the heart.
 * Mouse: a "Comparar" pill that shows on hover (always while picked). Same store as CompareTray (3 at most): a 4th
 * says so kindly instead of failing silently.
 */
export function CardCompareToggle({ id, locale }: { id: string; locale: Locale }) {
  const { compare, toggleCompare } = useApp();
  const on = compare.includes(id);
  const [full, setFull] = useState(false);
  const click = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!toggleCompare(id)) {
      setFull(true);
      window.setTimeout(() => setFull(false), 3000);
    }
  };
  const label = tx(locale, "Comparar", "Compare");
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        onClick={click}
        data-card-compare
        className={cn(
          "absolute right-[3.75rem] top-2.5 z-[2] flex h-11 w-11 items-center justify-center rounded-full shadow-sm backdrop-blur transition-transform duration-np hover:scale-105 [@media(hover:hover)]:hidden",
          on ? "bg-[#1C1D1D] text-[#EDE6DA]" : "bg-[#ffffffe6] text-[#1C1D1D]",
        )}
      >
        <Scale size={17} strokeWidth={1.8} aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={on}
        onClick={click}
        data-card-compare
        className={cn(
          "absolute bottom-2.5 left-2.5 z-[2] hidden min-h-9 items-center gap-1.5 rounded-full px-3 font-display text-[13px] font-semibold shadow-sm backdrop-blur transition-opacity duration-np focus-visible:opacity-100 [@media(hover:hover)]:inline-flex",
          on ? "bg-[#1C1D1D] text-[#EDE6DA] opacity-100" : "bg-[#ffffffe6] text-[#1C1D1D] opacity-0 group-hover:opacity-100",
        )}
      >
        <Scale size={14} aria-hidden /> {on ? tx(locale, "Comparando", "Comparing") : label}
      </button>
      {full && (
        <span role="status" className="np-in absolute inset-x-2.5 bottom-14 z-[3] rounded-2xl bg-[#1C1D1D] px-3.5 py-2.5 text-[13px] leading-snug text-[#EDE6DA] shadow-np">
          {tx(locale, "Ya tienes 3 casas para comparar. Quita una del comparador y añade esta.", "You already have 3 homes to compare. Remove one and add this one.")}
        </span>
      )}
    </>
  );
}

// Brand pills: egeo / arena for market states, navy for closed deals; status colours only where they warn.
const STATUS_TONE: Record<ListingStatus, string> = {
  DRAFT: "bg-[#5A534D] text-white",
  COMING_SOON: "bg-[#B79D83] text-[#3E4650]",
  ACTIVE: "bg-[#2F6B4F] text-white",
  UNDER_OFFER: "bg-[#D8CFC1] text-[#1C1D1D]",
  SOLD: "bg-[#1C1D1D] text-[#EDE6DA]",
  RENTED: "bg-[#1C1D1D] text-[#EDE6DA]",
  WITHDRAWN: "bg-danger text-white",
  EXPIRED: "bg-[#5A534D] text-white",
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
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]", STATUS_TONE[status], className)}>
      <span className="min-w-0 truncate">{lbl(STATUS_LABEL[status], locale)}</span>
    </span>
  );
}

export function Freshness({ iso, locale, className }: { iso: string; locale: Locale; className?: string }) {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      {/* Relative time differs between the cached server HTML and the browser: not a hydration error. */}
      <span className={cn("relative h-2 w-2 rounded-full", minutes < 60 ? "np-pulse bg-[#2F6B4F]" : "bg-mist")} suppressHydrationWarning />
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
