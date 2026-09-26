"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Film, LayoutPanelTop, Loader2, Star, UploadCloud } from "lucide-react";
import type { Listing, Locale, MediaJob } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Badge, Button, EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
import { dateTime, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const TONE: Record<MediaJob["status"], string> = { SCHEDULED: "bg-white/10 text-mist", SHOOTING: "bg-[#F26B4D33] text-coral", UPLOADING: "bg-[#C9862A33] text-[#F2B866]", DELIVERED: "bg-[#2F6F4E40] text-[#7FD3A8]" };
const NEXT: Record<MediaJob["status"], MediaJob["status"] | null> = { SCHEDULED: "SHOOTING", SHOOTING: "UPLOADING", UPLOADING: "DELIVERED", DELIVERED: null };

export function MediaView({ locale, jobs, listings }: { locale: Locale; jobs: MediaJob[]; listings: Listing[] }) {
  const router = useRouter();
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
      <AdminShell locale={locale} area="agency" title={tx(locale, "Trabajos de fotografía", "Media jobs")}>
        <EmptyState dark icon={<Camera size={20} />} title={tx(locale, "Sin trabajos asignados", "No jobs assigned")} body={tx(locale, "Cuando el backoffice te asigne una sesión aparecerá aquí.", "When backoffice assigns a shoot it will show up here.")} />
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
    <AdminShell locale={locale} area="agency" title={tx(locale, "Trabajos de fotografía", "Media jobs")}>
      <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          {jobs.map((j) => {
            const jl = byId.get(j.listingId);
            if (!jl) return null;
            return (
              <button key={j.id} onClick={() => setSel(j.id)} className={cn("flex w-full gap-3 rounded-np border p-3 text-left", sel === j.id ? "border-coral bg-white/[.04]" : "border-navy-line bg-navy-card hover:bg-white/[.03]")}>
                <PropertyArt scene={jl.scenes[0]} seed={jl.id} photo={listingPhoto(jl, 0)} className="h-14 w-20 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 font-semibold">{tx(locale, jl.title_es, jl.title_en)}</div>
                  <div className="text-xs capitalize text-mist">{dateTime(j.date, locale)}</div>
                  <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", TONE[j.status])}>{j.status}</span>
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
              <div className="flex gap-2">
                {NEXT[job.status] && (
                  <Button size="sm" variant="dark-outline" disabled={!!busy} onClick={() => run("status", () => api(`media/${job.id}`, { method: "PATCH", json: { status: NEXT[job.status] } }))}>
                    → {NEXT[job.status]}
                  </Button>
                )}
                <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy === "upload"}>
                  {busy === "upload" ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />} {tx(locale, "Subida masiva", "Bulk upload")}
                </Button>
              </div>
            </div>
            {err && <div className="mt-3 rounded-lg bg-[#B4231833] px-3 py-2 text-sm text-[#FF8A7A]">{err}</div>}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {items.map(([ok, t, I], i) => (
                <button
                  key={t}
                  disabled={i < 2}
                  onClick={() => run(`chk${i}`, () => api(`media/${job.id}`, { method: "PATCH", json: i === 2 ? { floorplan: !job.checklist.floorplan } : { video: !job.checklist.video } }))}
                  className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm", ok ? "border-[#2F6F4E80] text-[#7FD3A8]" : "border-navy-line text-mist", i >= 2 && "hover:border-coral")}
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
                    {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">{tx(locale, "Portada", "Cover")}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-np border border-dashed border-navy-line p-8 text-center text-sm text-mist">{tx(locale, "Aún no hay fotos. Usa «Subida masiva» (JPG/PNG/WebP, 12 MB máx. cada una).", "No photos yet. Use “Bulk upload” (JPG/PNG/WebP, 12 MB max each).")}</div>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-mist">
              <span>{tx(locale, "El orden y la portada se ajustan en «Editar inmueble» · StorageProvider: Local (dev) / S3 (prod)", "Order and cover are set in “Edit listing” · StorageProvider: Local (dev) / S3 (prod)")}</span>
              <Badge tone="dark">{job.status}</Badge>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
