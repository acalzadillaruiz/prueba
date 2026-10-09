"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Check, Film, LayoutPanelTop, Loader2, Plus, Star, UploadCloud } from "lucide-react";
import type { Listing, Locale, MediaJob } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button, Field } from "@/components/ui";
import { Empty, Pill, Select, k } from "./kit";
import { api } from "@/lib/api";
import { dateTime, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { caracasInputToIso, isoToCaracasInput } from "@/lib/caracas-time";

const TONE: Record<MediaJob["status"], "neutral" | "arena" | "egeo" | "ok"> = { SCHEDULED: "neutral", SHOOTING: "arena", UPLOADING: "egeo", DELIVERED: "ok" };
const ORDER: MediaJob["status"][] = ["SCHEDULED", "SHOOTING", "UPLOADING", "DELIVERED"];
const STATUS: Record<MediaJob["status"], [string, string]> = {
  SCHEDULED: ["Programada", "Scheduled"],
  SHOOTING: ["En sesión", "Shooting"],
  UPLOADING: ["Subiendo fotos", "Uploading"],
  DELIVERED: ["Entregada", "Delivered"],
};
const step = (s: MediaJob["status"], d: 1 | -1) => ORDER[ORDER.indexOf(s) + d] ?? null;

type Manage = { photographers: { id: string; name: string }[]; listings: { id: string; title: string; address: string }[] } | null;

function NewJob({ locale, manage, onDone }: { locale: Locale; manage: NonNullable<Manage>; onDone: () => void }) {
  const router = useRouter();
  const tomorrow = isoToCaracasInput(Date.now() + 864e5).slice(0, 11) + "10:00";
  const [f, setF] = useState({ listingId: manage.listings[0]?.id ?? "", photographerId: manage.photographers[0]?.id ?? "", date: tomorrow });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className={cn("np-in mb-6 p-5 md:p-6", k.card)}
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        const date = caracasInputToIso(f.date);
        if (!date) return setErr(tx(locale, "Indica una fecha y hora válidas.", "Enter a valid date and time."));
        setBusy(true);
        try {
          await api("media", { method: "POST", json: { ...f, date } });
          onDone();
          router.refresh();
        } catch (e2) {
          setErr((e2 as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className={k.title}>{tx(locale, "Nueva sesión de fotos", "New photo shoot")}</h2>
      {!manage.photographers.length ? (
        <p className={cn("mt-2 text-sm", k.muted)}>{tx(locale, "Tu agencia no tiene fotógrafos. Invita a uno desde «Equipo».", "Your agency has no photographers. Invite one from “Team”.")}</p>
      ) : !manage.listings.length ? (
        <p className={cn("mt-2 text-sm", k.muted)}>{tx(locale, "No hay inmuebles disponibles para fotografiar.", "There are no listings available to shoot.")}</p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <Field label={tx(locale, "Inmueble", "Listing")}>
            <Select required value={f.listingId} onChange={(e) => setF({ ...f, listingId: e.target.value })}>
              {manage.listings.map((l) => <option key={l.id} value={l.id}>{l.title} · {l.address}</option>)}
            </Select>
          </Field>
          <Field label={tx(locale, "Fotógrafo", "Photographer")}>
            <Select required value={f.photographerId} onChange={(e) => setF({ ...f, photographerId: e.target.value })}>
              {manage.photographers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
          <Field label={tx(locale, "Fecha y hora (Caracas)", "Date & time (Caracas)")}>
            <input required type="datetime-local" className={k.input} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Button variant="navy" className={k.navy} disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {tx(locale, "Asignar", "Assign")}</Button>
        </div>
      )}
      {err && <div role="alert" className={cn("mt-3", k.err)}>{err}</div>}
    </form>
  );
}

export function MediaView({ locale, jobs, listings, names = {}, manage = null }: { locale: Locale; jobs: MediaJob[]; listings: Listing[]; names?: Record<string, string>; manage?: Manage }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const statusLabel = (st: MediaJob["status"]) => tx(locale, STATUS[st][0], STATUS[st][1]);
  const newButton = manage ? (
    <Button className={k.primary} onClick={() => setCreating(!creating)} aria-expanded={creating}><Plus size={16} /> {tx(locale, "Nueva sesión", "New shoot")}</Button>
  ) : undefined;
  const newForm = manage && creating ? <NewJob locale={locale} manage={manage} onDone={() => setCreating(false)} /> : null;
  const byId = new Map(listings.map((l) => [l.id, l]));
  const [sel, setSel] = useState(jobs.find((j) => j.status !== "DELIVERED")?.id ?? jobs[0]?.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const job = jobs.find((j) => j.id === sel);
  const l = job ? byId.get(job.listingId) : undefined;
  const photos = l?.photos ?? [];

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const upload = (files: File[]) =>
    run("upload", async () => {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const r = await fetch(`/api/v1/listings/${l!.id}/photos`, { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json()).error?.message);
      await api(`media/${job!.id}`, { method: "PATCH", json: { status: job!.status === "DELIVERED" ? "DELIVERED" : "UPLOADING" } });
    });

  if (!jobs.length)
    return (
      <AdminShell locale={locale} area="agency" title={tx(locale, "Trabajos de fotografía", "Media jobs")} actions={newButton}>
        {newForm}
        <Empty className={k.card} title={tx(locale, "Sin trabajos asignados", "No jobs assigned")} body={manage ? tx(locale, "Crea una sesión con «Nueva sesión» y asígnala a un fotógrafo.", "Create a shoot with “New shoot” and assign it to a photographer.") : tx(locale, "Cuando la oficina te asigne una sesión, aparecerá aquí.", "When the office assigns you a shoot, it will show up here.")} />
      </AdminShell>
    );

  const items: [boolean, string, React.ElementType][] = job
    ? [
        [photos.length >= 20, tx(locale, `20 fotos (${photos.length}/20)`, `20 photos (${photos.length}/20)`), Camera],
        [photos.length > 0, tx(locale, "Portada", "Cover"), Star],
        [job.checklist.floorplan, tx(locale, "Plano", "Floor plan"), LayoutPanelTop],
        [job.checklist.video, "Video", Film],
      ]
    : [];

  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Trabajos de fotografía", "Media jobs")} actions={newButton}>
      {newForm}
      <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      <div className="grid gap-6 [&>*]:min-w-0 xl:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          {jobs.map((j) => {
            const jl = byId.get(j.listingId);
            if (!jl) return null;
            return (
              <button key={j.id} onClick={() => setSel(j.id)} aria-pressed={sel === j.id} className={cn("flex w-full gap-3 rounded-[18px] p-3 text-left transition-shadow duration-np", sel === j.id ? "bg-[#E6DDD2] shadow-[inset_0_0_0_2px_#1E1A18] dark:bg-white/[.08] dark:shadow-[inset_0_0_0_2px_#C9A574]" : cn(k.card, "hover:shadow-[0_8px_24px_rgba(30,26,24,.1)]"))}>
                <PropertyArt scene={jl.scenes[0]} seed={jl.id} photo={listingPhoto(jl, 0)} className="h-16 w-20 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 font-semibold">{tx(locale, jl.title_es, jl.title_en)}</div>
                  <div className={cn("text-xs first-letter:uppercase", k.muted)}>{dateTime(j.date, locale)}</div>
                  {manage && names[j.photographerId] && <div className={cn("truncate text-xs", k.muted)}>{names[j.photographerId]}</div>}
                  <Pill tone={TONE[j.status]} className="mt-1.5">{statusLabel(j.status)}</Pill>
                </div>
              </button>
            );
          })}
        </div>
        {job && l && (
          <div className={cn(k.card, "self-start p-5 md:p-6")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className={k.title}>{tx(locale, l.title_es, l.title_en)}</h2>
                <div className={cn("text-sm", k.muted)}>{l.address} · {l.zone}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {step(job.status, -1) && (
                  <Button size="sm" variant="ghost" className={k.ghost} disabled={!!busy} onClick={() => run("status", () => api(`media/${job.id}`, { method: "PATCH", json: { status: step(job.status, -1) } }))} aria-label={tx(locale, `Volver a «${statusLabel(step(job.status, -1)!)}»`, `Back to “${statusLabel(step(job.status, -1)!)}”`)}>
                    <ArrowLeft size={14} /> {statusLabel(step(job.status, -1)!)}
                  </Button>
                )}
                {step(job.status, 1) && (
                  <Button size="sm" variant="outline" className={k.outline} disabled={!!busy} onClick={() => run("status", () => api(`media/${job.id}`, { method: "PATCH", json: { status: step(job.status, 1) } }))} aria-label={tx(locale, `Avanzar a «${statusLabel(step(job.status, 1)!)}»`, `Move to “${statusLabel(step(job.status, 1)!)}”`)}>
                    {statusLabel(step(job.status, 1)!)} <ArrowRight size={14} />
                  </Button>
                )}
                <Button size="sm" variant="navy" className={k.navy} onClick={() => fileRef.current?.click()} disabled={busy === "upload"}>
                  {busy === "upload" ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />} {tx(locale, "Subida masiva", "Bulk upload")}
                </Button>
              </div>
            </div>
            {manage && (
              <div className={cn("mt-4 grid gap-3 rounded-xl p-4 sm:grid-cols-2", k.soft)}>
                <Field label={tx(locale, "Fotógrafo asignado", "Assigned photographer")}>
                  <Select disabled={busy === "assign"} value={job.photographerId} onChange={(e) => run("assign", () => api(`media/${job.id}`, { method: "PATCH", json: { photographerId: e.target.value } }))}>
                    {!manage.photographers.some((p) => p.id === job.photographerId) && <option value={job.photographerId}>{names[job.photographerId] ?? "—"}</option>}
                    {manage.photographers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
                <Field label={tx(locale, "Fecha y hora (Caracas)", "Date & time (Caracas)")}>
                  <input
                    key={job.id + job.date}
                    type="datetime-local"
                    className={k.input}
                    disabled={busy === "date"}
                    defaultValue={isoToCaracasInput(job.date)}
                    onBlur={(e) => {
                      const iso = caracasInputToIso(e.target.value);
                      if (iso && iso !== new Date(job.date).toISOString()) run("date", () => api(`media/${job.id}`, { method: "PATCH", json: { date: iso } }));
                    }}
                  />
                </Field>
              </div>
            )}
            {err && <div role="alert" className={cn("mt-3", k.err)}>{err}</div>}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {items.map(([ok, t, I], i) => (
                <button
                  key={t}
                  disabled={i < 2}
                  onClick={() => run(`chk${i}`, () => api(`media/${job.id}`, { method: "PATCH", json: i === 2 ? { floorplan: !job.checklist.floorplan } : { video: !job.checklist.video } }))}
                  className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm", ok ? cn("border-ok/40 font-semibold", k.okText) : cn(k.line, k.muted), i >= 2 && "hover:border-navy dark:hover:border-ivory/50")}
                >
                  {ok ? <Check size={15} /> : <I size={15} />}
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-[#ECE6DA] dark:bg-white/10"><div className="h-full rounded-full bg-navy transition-all duration-500 dark:bg-ivory" style={{ width: `${Math.min(100, (photos.length / 20) * 100)}%` }} /></div>
            {photos.length ? (
              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                {photos.map((src, i) => (
                  <div key={src} className={cn("relative overflow-hidden rounded-lg ring-2", i === 0 ? "ring-navy dark:ring-ivory" : "ring-transparent")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded bg-navy/80 px-1 text-[10px] font-bold text-ivory">{i + 1}</span>
                    {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-white px-1.5 text-[10px] font-bold uppercase tracking-wider text-navy">{tx(locale, "Portada", "Cover")}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn("mt-5 rounded-xl border border-dashed p-8 text-center text-sm", k.line, k.muted)}>{tx(locale, "Aún no hay fotos. Usa «Subida masiva» (JPG/PNG/WebP, 12 MB máx. cada una).", "No photos yet. Use “Bulk upload” (JPG/PNG/WebP, 12 MB max each).")}</div>
            )}
            <div className={cn("mt-4 flex flex-wrap items-center justify-between gap-2 text-xs", k.muted)}>
              <span>{tx(locale, "El orden y la portada se ajustan en «Editar inmueble».", "Order and cover are set in “Edit listing”.")}</span>
              <Pill tone={TONE[job.status]}>{statusLabel(job.status)}</Pill>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
