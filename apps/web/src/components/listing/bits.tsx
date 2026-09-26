"use client";

import { Heart, Scale } from "lucide-react";
import type { Listing, ListingStatus, Locale } from "@/types/domain";
import { useDemo } from "@/lib/store";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, ago, lbl, tx } from "@/lib/i18n";

export function SaveButton({ id, className, locale }: { id: string; className?: string; locale: Locale }) {
  const { saved, toggleSaved } = useDemo();
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
      className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-transform duration-np hover:scale-105", className)}
    >
      <Heart size={17} className={on ? "fill-coral text-coral" : "text-navy"} />
    </button>
  );
}

export function CompareButton({ id, locale, dark }: { id: string; locale: Locale; dark?: boolean }) {
  const { compare, toggleCompare } = useDemo();
  const on = compare.includes(id);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleCompare(id);
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors duration-np",
        on ? "border-navy bg-navy text-ivory" : dark ? "border-white/20 text-ivory" : "border-line bg-white text-ink/70 hover:border-navy/40",
      )}
    >
      <Scale size={13} /> {on ? tx(locale, "Comparando", "Comparing") : tx(locale, "Comparar", "Compare")}
    </button>
  );
}

const STATUS_TONE: Record<ListingStatus, string> = {
  DRAFT: "bg-black/60 text-white",
  COMING_SOON: "bg-[#6B7FA3] text-white",
  ACTIVE: "bg-ok text-white",
  UNDER_OFFER: "bg-warn text-white",
  SOLD: "bg-navy text-ivory",
  RENTED: "bg-navy text-ivory",
  WITHDRAWN: "bg-danger text-white",
  EXPIRED: "bg-black/50 text-white",
};

export function StatusBadge({ status, locale, className }: { status: ListingStatus; locale: Locale; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", STATUS_TONE[status], className)}>
      {lbl(STATUS_LABEL[status], locale)}
    </span>
  );
}

export function Freshness({ iso, locale, className }: { iso: string; locale: Locale; className?: string }) {
  const minutes = Math.round((Date.parse("2026-09-26T18:00:00Z") - Date.parse(iso)) / 60000);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span className={cn("relative h-2 w-2 rounded-full", minutes < 60 ? "np-pulse bg-coral" : "bg-mist")} />
      {tx(locale, "Actualizado", "Updated")} {ago(iso, locale)}
    </span>
  );
}
