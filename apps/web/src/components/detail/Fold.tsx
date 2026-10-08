"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Secondary listing section as a disclosure (heading + button, WAI-ARIA disclosure pattern). Folded on phones so the
 * contact card comes sooner; opened on wide screens (≥ `openFrom` px) where the page has two columns. A one-line
 * `hint` tells what's inside while it is folded.
 */
export function Fold({ title, hint, children, className, testId, openFrom = 1024 }: { title: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; className?: string; testId?: string; openFrom?: number }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    if (window.matchMedia(`(min-width: ${openFrom}px)`).matches) setOpen(true);
  }, [openFrom]);
  return (
    <section className={className} data-testid={testId} data-open={open || undefined}>
      <h3 className="font-serif text-[28px] leading-tight">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="group flex min-h-11 w-full items-center gap-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          <span className="min-w-0 flex-1">
            {title}
            {hint && !open && <span className="mt-1 block font-display text-[15px] leading-snug text-muted">{hint}</span>}
          </span>
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line transition-colors duration-np group-hover:border-navy/40">
            <ChevronDown size={18} strokeWidth={1.8} className={cn("transition-transform duration-300", open && "rotate-180")} />
          </span>
        </button>
      </h3>
      <div id={id} hidden={!open} className="pt-5">
        {children}
      </div>
    </section>
  );
}
