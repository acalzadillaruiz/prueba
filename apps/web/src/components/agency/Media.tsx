"use client";

import { useState } from "react";
import { Camera, Check, Film, GripVertical, LayoutPanelTop, Star, UploadCloud } from "lucide-react";
import type { Locale, MediaJob } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Badge, Button } from "@/components/ui";
import { MEDIA_JOBS } from "@/mock/ops";
import { listingById } from "@/mock/listings";
import { dateTime, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

const TONE: Record<MediaJob["status"], string> = { SCHEDULED: "bg-white/10 text-mist", SHOOTING: "bg-[#F26B4D33] text-coral", UPLOADING: "bg-[#C9862A33] text-[#F2B866]", DELIVERED: "bg-[#2F6F4E40] text-[#7FD3A8]" };

export function MediaView({ locale }: { locale: Locale }) {
  const [sel, setSel] = useState(MEDIA_JOBS[2].id);
  const [uploaded, setUploaded] = useState(14);
  const [cover, setCover] = useState(0);
  const job = MEDIA_JOBS.find((j) => j.id === sel)!;
  const l = listingById(job.listingId)!;
  const photos = Array.from({ length: uploaded }, (_, i) => l.scenes[i % l.scenes.length]);
  const items: [boolean, string, React.ElementType][] = [
    [uploaded >= 20, tx(locale, `20 fotos (${uploaded}/20)`, `20 photos (${uploaded}/20)`), Camera],
    [true, tx(locale, "Portada", "Cover"), Star],
    [job.checklist.floorplan, tx(locale, "Plano", "Floor plan"), LayoutPanelTop],
    [job.checklist.video, "Video", Film],
  ];
  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Trabajos de fotografía", "Media jobs")}>
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-3">
          {MEDIA_JOBS.map((j) => {
            const jl = listingById(j.listingId)!;
            return (
              <button key={j.id} onClick={() => setSel(j.id)} className={cn("flex w-full gap-3 rounded-np border p-3 text-left", sel === j.id ? "border-coral bg-white/[.04]" : "border-navy-line bg-navy-card hover:bg-white/[.03]")}>
                <PropertyArt scene={jl.scenes[0]} seed={jl.id} className="h-14 w-20 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 font-semibold">{tx(locale, jl.title_es, jl.title_en)}</div>
                  <div className="text-xs capitalize text-mist">{dateTime(j.date, locale)}</div>
                  <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", TONE[j.status])}>{j.status}</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="rounded-np border border-navy-line bg-navy-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-xl font-semibold">{tx(locale, l.title_es, l.title_en)}</div>
              <div className="text-sm text-mist">{l.address} · {l.zone}</div>
            </div>
            <Button size="sm" onClick={() => setUploaded(20)}><UploadCloud size={15} /> {tx(locale, "Subida masiva", "Bulk upload")}</Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {items.map(([ok, t, I]) => (
              <div key={t} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", ok ? "border-[#2F6F4E80] text-[#7FD3A8]" : "border-navy-line text-mist")}>{ok ? <Check size={15} /> : <I size={15} />}{t}</div>
            ))}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-coral transition-all duration-500" style={{ width: `${(uploaded / 20) * 100}%` }} /></div>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {photos.map((s, i) => (
              <div key={i} className={cn("np-in group relative overflow-hidden rounded-md ring-2", cover === i ? "ring-coral" : "ring-transparent")} style={{ animationDelay: `${(i % 6) * 40}ms` }}>
                <PropertyArt scene={s} seed={l.id + "m" + i} className="aspect-[4/3] w-full" />
                <span className="absolute left-1 top-1 rounded bg-navy/80 px-1 text-[10px] font-bold">{i + 1}</span>
                <GripVertical size={13} className="absolute right-1 top-1 text-white drop-shadow" />
                {cover === i ? <span className="absolute bottom-1 left-1 rounded-full bg-coral px-1.5 text-[10px] font-bold text-white">{tx(locale, "Portada", "Cover")}</span> : <button onClick={() => setCover(i)} className="absolute bottom-1 left-1 rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-navy opacity-0 group-hover:opacity-100">{tx(locale, "Portada", "Cover")}</button>}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-mist">
            <span>{tx(locale, "Arrastra para ordenar · StorageProvider: Local (dev) / S3 (prod)", "Drag to reorder · StorageProvider: Local (dev) / S3 (prod)")}</span>
            <Badge tone="dark">{job.status}</Badge>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
