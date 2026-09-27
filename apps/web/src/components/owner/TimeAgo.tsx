"use client";

import { useEffect, useState } from "react";
import { ago, dateTime, tx } from "@/lib/i18n";
import type { Locale } from "@/types/domain";

/**
 * "hace 5 min" depends on the clock, so it can't be rendered on the server (React #418 hydration mismatch).
 * Server + first client render show the absolute date (fixed Caracas time zone → identical on both);
 * after mount it switches to the relative time and refreshes every minute.
 */
export function TimeAgo({ iso, locale, className }: { iso: string; locale: Locale; className?: string }) {
  const [rel, setRel] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setRel(ago(iso, locale));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [iso, locale]);
  const abs = dateTime(iso, locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <time dateTime={iso} title={abs} className={className} suppressHydrationWarning aria-label={rel ? `${rel} (${abs})` : tx(locale, `el ${abs}`, `on ${abs}`)}>
      {rel ?? abs}
    </time>
  );
}
