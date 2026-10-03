"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Check, Film, LayoutPanelTop, Loader2, Plus, Star, UploadCloud } from "lucide-react";
import type { Listing, Locale, MediaJob } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Badge, Button, EmptyState, Field, darkInputCls } from "@/components/ui";
import { api } from "@/lib/api";
import { dateTime, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { caracasInputToIso, isoToCaracasInput } from "@/lib/caracas-time";

const TONE: Record<MediaJob["status"], string> = { SCHEDULED: "bg-white/10 text-mist", SHOOTING: "bg-[#A8452A33] text-coral", UPLOADING: "bg-[#8A5A0033] text-[#F2B866]", DELIVERED: "bg-[#2F6B4F40] text-[#7FC8A4]" };
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
      className="np-in mb-6 rounded-np border border-navy-line bg-navy-card p-4"
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
      <div className="font-display text-lg font-semibold">{tx(locale, "Nueva sesión de fotos", "New photo shoot")}</div>
      {!manage.photographers.length ? (
        <p className="mt-2 text-sm text-mist">{tx(locale, "Tu agencia no tiene fotógrafos. Invita a uno desde «Equipo».", "Your agency has no photographers. Invite one from “Team”.")}</p>
      ) : !manage.listings.length ? (
        <p className="mt-2 text-sm text-mist">{tx(locale, "No hay inmuebles disponibles para fotografiar.", "There are no listings available to shoot.")}</p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
          <Field dark label={tx(locale, "Inmueble", "Listing")}>
            <select required className={darkInputCls} value={f.listingId} onChange={(e) => setF({ ...f, listingId: e.target.value })}>
              {manage.listings.map((l) => <option key={l.id} value={l.id}>{l.title} · {l.address}</option>)}
            </select>
          </Field>
          <Field dark label={tx(locale, "Fotógrafo", "Photographer")}>
            <select required className={darkInputCls} value={f.photographerId} onChange={(e) => setF({ ...f, photographerId: e.target.value })}>
              {manage.photographers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field dark label={tx(locale, "Fecha y hora (Caracas)", "Date & time (Caracas)")}>
            <input required type="datetime-local" className={darkInputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
          <Button disabled={busy}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {tx(locale, "Asignar", "Assign")}</Button>
        </div>
      )}
      {err && <div role="alert" className="mt-3 rounded-lg bg-[#B3261E33] px-3 py-2 text-sm text-[#E79A7F]">{err}</div>}
    </form>
  );
}

export function MediaView({ locale, jobs, listings, names = {}, manage = null }: { locale: Locale; jobs: MediaJob[]; listings: Listing[]; names?: Record<string, string>; manage?: Manage }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const statusLabel = (st: MediaJob["status"]) => tx(locale, STATUS[st][0], STATUS[st][1]);
  const newButton = manage ? (
    <Button size="sm" onClick={() => setCreating(!creating)} aria-expanded={creating}><Plus size={15} /> {tx(locale, "Nueva sesión", "New shoot")}</Button>
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
        <EmptyState dark icon={<Camera size={20} />} title={tx(locale, "Sin trabajos asignados", "No jobs assigned")} body={manage ? tx(locale, "Crea una sesión con «Nueva sesión» y asígnala a un fotógrafo.", "Create a shoot with “New shoot” and assign it to a photographer.") : tx(locale, "Cuando el backoffice te asigne una sesión aparecerá aquí.", "When backoffice assigns a shoot it will show up here.")} />
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
              <button key={j.id} onClick={() => setSel(j.id)} className={cn("flex w-full gap-3 rounded-np border p-3 text-left", sel === j.id ? "border-coral bg-white/[.04]" : "border-navy-line bg-navy-card hover:bg-white/[.03]")}>
                <PropertyArt scene={jl.scenes[0]} seed={jl.id} photo={listingPhoto(jl, 0)} className="h-14 w-20 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 font-semibold">{tx(locale, jl.title_es, jl.title_en)}</div>
                  <div className="text-xs first-letter:uppercase text-mist">{dateTime(j.date, locale)}</div>
                  {manage && names[j.photographerId] && <div className="truncate text-xs text-mist">{names[j.photographerId]}</div>}
                  <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", TONE[j.status])}>{statusLabel(j.status)}</span>
                </div>
              </button>
            );
          })}
        </div>
        {job && l && (
          <div className="rounded-np border border-navy-line bg-navy-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display text-xl font-semibold">{tx(locale, l.title_es, l.title_en)}</div>
                <div className="text-sm text-mist">{l.address} · {l.zone}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {step(job.status, -1) && (
                  <Button size="sm" variant="dark-ghost" disabled={!!busy} onClick={() => run("status", () => api(`media/${job.id}`, { method: "PATCH", json: { status: step(job.status, -1) } }))} aria-label={tx(locale, `Volver a «${statusLabel(step(job.status, -1)!)}»`, `Back to “${statusLabel(step(job.status, -1)!)}”`)}>
                    <ArrowLeft size={14} /> {statusLabel(step(job.status, -1)!)}
                  </Button>
                )}
                {step(job.status, 1) && (
                  <Button size="sm" variant="dark-outline" disabled={!!busy} onClick={() => run("status", () => api(`media/${job.id}`, { method: "PATCH", json: { status: step(job.status, 1) } }))} aria-label={tx(locale, `Avanzar a «${statusLabel(step(job.status, 1)!)}»`, `Move to “${statusLabel(step(job.status, 1)!)}”`)}>
                    {statusLabel(step(job.status, 1)!)} <ArrowRight size={14} />
                  </Button>
                )}
                <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy === "upload"}>
                  {busy === "upload" ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />} {tx(locale, "Subida masiva", "Bulk upload")}
                </Button>
              </div>
            </div>
            {manage && (
              <div className="mt-4 grid gap-3 rounded-lg border border-navy-line p-3 sm:grid-cols-2">
                <Field dark label={tx(locale, "Fotógrafo asignado", "Assigned photographer")}>
                  <select className={darkInputCls} disabled={busy === "assign"} value={job.photographerId} onChange={(e) => run("assign", () => api(`media/${job.id}`, { method: "PATCH", json: { photographerId: e.target.value } }))}>
                    {!manage.photographers.some((p) => p.id === job.photographerId) && <option value={job.photographerId}>{names[job.photographerId] ?? "—"}</option>}
                    {manage.photographers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field dark label={tx(locale, "Fecha y hora (Caracas)", "Date & time (Caracas)")}>
                  <input
                    key={job.id + job.date}
                    type="datetime-local"
                    className={darkInputCls}
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
            {err && <div role="alert" className="mt-3 rounded-lg bg-[#B3261E33] px-3 py-2 text-sm text-[#E79A7F]">{err}</div>}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {items.map(([ok, t, I], i) => (
                <button
                  key={t}
                  disabled={i < 2}
                  onClick={() => run(`chk${i}`, () => api(`media/${job.id}`, { method: "PATCH", json: i === 2 ? { floorplan: !job.checklist.floorplan } : { video: !job.checklist.video } }))}
                  className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm", ok ? "border-[#2F6B4F80] text-[#7FC8A4]" : "border-navy-line text-mist", i >= 2 && "hover:border-coral")}
                >
                  {ok ? <Check size={15} /> : <I size={15} />}
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-coral transition-all duration-500" style={{ width: `${Math.min(100, (photos.length / 20) * 100)}%` }} /></div>
            {photos.length ? (
              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                {photos.map((src, i) => (
                  <div key={src} className={cn("relative overflow-hidden rounded-md ring-2", i === 0 ? "ring-coral" : "ring-transparent")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded bg-navy/80 px-1 text-[10px] font-bold">{i + 1}</span>
                    {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-coral-cta px-1.5 text-[10px] font-bold text-white">{tx(locale, "Portada", "Cover")}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-np border border-dashed border-navy-line p-8 text-center text-sm text-mist">{tx(locale, "Aún no hay fotos. Usa «Subida masiva» (JPG/PNG/WebP, 12 MB máx. cada una).", "No photos yet. Use “Bulk upload” (JPG/PNG/WebP, 12 MB max each).")}</div>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-mist">
              <span>{tx(locale, "El orden y la portada se ajustan en «Editar inmueble» · StorageProvider: Local (dev) / S3 (prod)", "Order and cover are set in “Edit listing” · StorageProvider: Local (dev) / S3 (prod)")}</span>
              <Badge tone="dark">{statusLabel(job.status)}</Badge>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
