"use client";

import { Loader2, X } from "lucide-react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";

/** Progress / result of a bulk action run row by row through the regular single-item endpoints. */
export type Bulk = { label: string; done: number; total: number; failed: { title: string; msg: string }[]; skipped: number; running: boolean };

/**
 * Runs `call` for each item sequentially (the same PATCH endpoint and permission checks as the single action), reporting
 * progress through `onProgress`. `call` returns null to skip an item that needs no change. Resolves with the ids that succeeded.
 */
export async function runSequential<T extends { id: string }>(label: string, items: T[], title: (t: T) => string, call: (t: T) => Promise<unknown> | null, onProgress: (b: Bulk) => void): Promise<string[]> {
  const state: Bulk = { label, done: 0, total: items.length, failed: [], skipped: 0, running: true };
  onProgress({ ...state });
  const ok: string[] = [];
  for (const it of items) {
    try {
      const r = call(it);
      if (r === null) state.skipped++;
      else {
        await r;
        ok.push(it.id);
      }
    } catch (e) {
      state.failed.push({ title: title(it), msg: (e as Error).message });
    }
    state.done++;
    onProgress({ ...state, failed: [...state.failed] });
  }
  state.running = false;
  onProgress({ ...state, failed: [...state.failed] });
  return ok;
}

export function BulkResult({ locale, bulk, onClose }: { locale: Locale; bulk: Bulk; onClose: () => void }) {
  if (bulk.running)
    return (
      <span className="inline-flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" /> {bulk.label}: {tx(locale, `${bulk.done} de ${bulk.total}…`, `${bulk.done} of ${bulk.total}…`)}
      </span>
    );
  const ok = bulk.total - bulk.failed.length - bulk.skipped;
  return (
    <div className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-1">
        <span className="font-semibold">{bulk.label}:</span> {tx(locale, `${ok} ${ok === 1 ? "actualizado" : "actualizados"}`, `${ok} updated`)}
        {bulk.skipped > 0 && tx(locale, ` · ${bulk.skipped} ya estaban así`, ` · ${bulk.skipped} already set`)}
        {bulk.failed.length > 0 && tx(locale, ` · ${bulk.failed.length} no se pudieron cambiar (siguen seleccionados):`, ` · ${bulk.failed.length} could not be changed (still selected):`)}
        {bulk.failed.length > 0 && (
          <ul className="mt-1 list-disc pl-5 text-[13px]">
            {bulk.failed.slice(0, 5).map((f, i) => <li key={i}>{f.title} — {f.msg}</li>)}
          </ul>
        )}
      </div>
      <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-black/5" aria-label={tx(locale, "Cerrar aviso", "Dismiss")}><X size={14} /></button>
    </div>
  );
}
