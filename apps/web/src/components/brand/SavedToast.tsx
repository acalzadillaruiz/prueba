"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Heart } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";

/**
 * Quiet confirmation after a heart: "Guardada · Ver guardadas". Bottom centre (above the phone tab bar / sticky
 * contact bar, see globals.css `[data-np-toast]`), announced politely, gone after a few seconds.
 * `nonce` changes on every save so a second heart restarts the timer.
 */
export function SavedToast({ locale, nonce, onClose }: { locale: Locale; nonce: number; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(t);
  }, [nonce, onClose]);
  return (
    <div
      data-np-toast
      role="status"
      aria-live="polite"
      className="np-in fixed inset-x-0 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full bg-navy py-2 pl-4 pr-2 font-display text-[15px] text-ivory shadow-[0_0_0_1px_rgba(201,165,116,.45),0_16px_36px_rgba(30,26,24,.32)] print:hidden"
    >
      <Heart size={16} className="shrink-0 fill-[#C9A574] text-[#C9A574]" aria-hidden />
      <span>{tx(locale, "Guardada", "Saved")}</span>
      <span aria-hidden className="text-ivory/40">·</span>
      <Link href={`/${locale}/saved`} onClick={onClose} className="flex min-h-9 items-center rounded-full px-3 font-semibold text-[#C9A574] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A574]">
        {tx(locale, "Ver guardadas", "See saved")}
      </Link>
    </div>
  );
}
