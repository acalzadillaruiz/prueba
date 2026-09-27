/** <input type="datetime-local"> values are read as America/Caracas wall time (UTC−4, no DST), like every date shown in the app. */
const OFFSET = "-04:00";

export function caracasInputToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function isoToCaracasInput(iso: string | number | Date): string {
  const d = new Date(new Date(iso).getTime() - 4 * 3600e3);
  return d.toISOString().slice(0, 16);
}
