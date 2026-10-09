"use client";

import { useLayoutEffect, useRef } from "react";
import type { Locale } from "@/types/domain";
import { num } from "@/lib/i18n";
import { inputCls } from "@/components/ui";

/**
 * The price with thousands separators while you type ("1.650.000" / "1,650,000"); state keeps the plain number. Only
 * digits count: anything else typed or pasted is dropped, and the caret stays after the same digit it was after (the
 * separators that appear or vanish never push it around).
 */
export function PriceInput({ locale, value, invalid, onBlur, onChange, className = inputCls, required, id, placeholder }: { locale: Locale; value: number; placeholder?: string; invalid?: boolean; onBlur?: () => void; onChange: (n: number) => void; className?: string; required?: boolean; id?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  /** Digits left of the caret after the last edit; applied once the formatted value has rendered. */
  const caret = useRef<number | null>(null);
  const shown = value > 0 ? num(value, locale) : "";
  useLayoutEffect(() => {
    const el = ref.current;
    const want = caret.current;
    if (!el || want === null || document.activeElement !== el) return;
    caret.current = null;
    let pos = 0;
    for (let seen = 0; pos < shown.length && seen < want; pos++) if (/\d/.test(shown[pos])) seen++;
    el.setSelectionRange(pos, pos);
  }, [shown]);
  return (
    <input
      ref={ref}
      id={id}
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      required={required}
      placeholder={placeholder}
      value={shown}
      aria-invalid={invalid}
      onBlur={onBlur}
      onChange={(e) => {
        const raw = e.target.value;
        const at = e.target.selectionStart ?? raw.length;
        caret.current = raw.slice(0, at).replace(/\D/g, "").replace(/^0+/, "").length;
        const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12);
        const next = digits ? Number(digits) : 0;
        // A stray non-digit leaves the number as it was: React puts the old text back (caret to the end), so put it back too.
        if (next === value) {
          const el = e.target;
          const want = caret.current;
          caret.current = null;
          requestAnimationFrame(() => {
            let pos = 0;
            for (let seen = 0; pos < el.value.length && seen < (want ?? 0); pos++) if (/\d/.test(el.value[pos])) seen++;
            if (document.activeElement === el) el.setSelectionRange(pos, pos);
          });
          return;
        }
        onChange(next);
      }}
    />
  );
}
