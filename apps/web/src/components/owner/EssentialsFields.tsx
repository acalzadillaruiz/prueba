"use client";

import { Field, inputCls } from "@/components/ui";
import { k, tab } from "@/components/agency/kit";
import { MAX_DOCK_FEET, MAX_TANK_LITERS } from "@/lib/essentials";
import { cn } from "@/lib/cn";
import { tx } from "@/lib/i18n";
import type { Listing, Locale, PowerBackup } from "@/types/domain";

/** Form state (numbers as strings so a field can be empty while typing). */
export type EssentialsDraft = { powerBackup: PowerBackup | null; ownWell: boolean; waterTankLiters: string; dockFeet: string; viewAvila: boolean; viewSea: boolean };
export type EssentialsPayload = { powerBackup: PowerBackup | null; ownWell: boolean; waterTankLiters: number | null; dockFeet: number | null; viewAvila: boolean; viewSea: boolean };

export const EMPTY_ESSENTIALS: EssentialsDraft = { powerBackup: null, ownWell: false, waterTankLiters: "", dockFeet: "", viewAvila: false, viewSea: false };

export function essentialsFrom(l: Pick<Listing, "powerBackup" | "ownWell" | "waterTankLiters" | "dockFeet" | "viewAvila" | "viewSea">): EssentialsDraft {
  return {
    powerBackup: l.powerBackup ?? null,
    ownWell: !!l.ownWell,
    waterTankLiters: l.waterTankLiters ? String(l.waterTankLiters) : "",
    dockFeet: l.dockFeet ? String(l.dockFeet) : "",
    viewAvila: !!l.viewAvila,
    viewSea: !!l.viewSea,
  };
}

/** Same bounds as the API (essentialsSchema). Empty number = unknown (null). */
export function validateEssentials(locale: Locale, x: EssentialsDraft): { payload: EssentialsPayload; errors: { waterTankLiters?: string; dockFeet?: string }; ok: boolean } {
  const errors: { waterTankLiters?: string; dockFeet?: string } = {};
  const parse = (v: string, max: number) => {
    if (v.trim() === "") return { v: null, bad: false };
    const n = Number(v);
    return Number.isInteger(n) && n > 0 && n <= max ? { v: n, bad: false } : { v: null, bad: true };
  };
  const tank = parse(x.waterTankLiters, MAX_TANK_LITERS);
  const dock = parse(x.dockFeet, MAX_DOCK_FEET);
  if (tank.bad) errors.waterTankLiters = tx(locale, "Litros: número entero entre 1 y 1.000.000, o vacío.", "Litres: whole number between 1 and 1,000,000, or empty.");
  if (dock.bad) errors.dockFeet = tx(locale, `Pies: número entero entre 1 y ${MAX_DOCK_FEET}, o vacío.`, `Feet: whole number between 1 and ${MAX_DOCK_FEET}, or empty.`);
  return {
    payload: { powerBackup: x.powerBackup, ownWell: x.ownWell, waterTankLiters: tank.v, dockFeet: dock.v, viewAvila: x.viewAvila, viewSea: x.viewSea },
    errors,
    ok: !tank.bad && !dock.bad,
  };
}

const POWER_OPTIONS: [PowerBackup | null, string, string][] = [
  ["FULL", "100 %", "100%"],
  ["PARTIAL", "Parcial", "Partial"],
  ["NONE", "No tiene", "None"],
  [null, "Sin dato", "Unknown"],
];

/** Planta eléctrica (segmented), pozo / vistas (toggles), tanque (L) y muelle (pies). */
export function EssentialsFields({
  locale,
  value,
  onChange,
  showErrors = true,
  admin = false,
  disabled = false,
}: {
  locale: Locale;
  value: EssentialsDraft;
  onChange: (x: EssentialsDraft) => void;
  showErrors?: boolean;
  /** Private cockpit skin (agency editor). */
  admin?: boolean;
  disabled?: boolean;
}) {
  const { errors } = validateEssentials(locale, value);
  const err = (key: keyof typeof errors) => (showErrors ? errors[key] : undefined);
  const set = (p: Partial<EssentialsDraft>) => onChange({ ...value, ...p });
  const cls = admin ? k.input : inputCls;
  const seg = (on: boolean) =>
    admin ? cn(tab(on), "min-h-11 md:min-h-9") : cn("min-h-11 rounded-full border px-4 font-display text-sm", on ? "border-navy bg-[#E6DDD2] font-semibold text-navy ring-1 ring-navy" : "border-line bg-white");
  const toggle = (key: "ownWell" | "viewAvila" | "viewSea", label: string) => (
    <label key={key} className="flex min-h-11 items-center gap-2 text-sm font-semibold md:min-h-0">
      <input type="checkbox" disabled={disabled} checked={value[key]} onChange={(e) => set({ [key]: e.target.checked })} className="h-4 w-4 accent-navy dark:accent-[#C9A574]" />
      {label}
    </label>
  );
  const unitInput = (key: "waterTankLiters" | "dockFeet", label: string, unit: string, max: number, hint: string) => (
    <Field label={label} hint={hint} error={err(key)}>
      <span className="relative block">
        <input
          className={cn(cls, "pr-14")}
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          step={1}
          disabled={disabled}
          aria-invalid={!!err(key)}
          value={value[key]}
          onChange={(e) => set({ [key]: e.target.value })}
        />
        <span className={cn("pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-semibold", admin ? k.muted : "text-muted")} aria-hidden>{unit}</span>
      </span>
    </Field>
  );

  return (
    <div className="space-y-4" data-testid="essentials-fields">
      <div className={admin ? k.title : "font-semibold"}>{tx(locale, "Servicios esenciales", "Essential services")}</div>
      <div role="group" aria-label={tx(locale, "Planta eléctrica", "Backup power")}>
        <div className="mb-2 text-sm font-semibold">{tx(locale, "Planta eléctrica", "Backup power")}</div>
        <div className="flex flex-wrap gap-2">
          {POWER_OPTIONS.map(([v, es, en]) => (
            <button key={String(v)} type="button" aria-pressed={value.powerBackup === v} disabled={disabled} onClick={() => set({ powerBackup: v })} className={seg(value.powerBackup === v)}>
              {tx(locale, es, en)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {unitInput("waterTankLiters", tx(locale, "Tanque de agua", "Water tank"), "L", MAX_TANK_LITERS, tx(locale, "Capacidad en litros. Vacío si no se sabe.", "Capacity in litres. Leave empty if unknown."))}
        {unitInput("dockFeet", tx(locale, "Muelle", "Dock"), tx(locale, "pies", "ft"), MAX_DOCK_FEET, tx(locale, "Largo en pies (canales, marinas). Vacío si no tiene.", "Length in feet (canals, marinas). Empty if none."))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {toggle("ownWell", tx(locale, "Pozo de agua propio", "Private water well"))}
        {toggle("viewAvila", tx(locale, "Vista al Ávila", "Ávila mountain view"))}
        {toggle("viewSea", tx(locale, "Vista al mar", "Sea view"))}
      </div>
    </div>
  );
}
