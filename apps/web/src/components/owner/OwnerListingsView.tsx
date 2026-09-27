"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Eye, Heart, ImagePlus, Inbox, Loader2, Pencil, Plus, Send, TrendingDown } from "lucide-react";
import type { Listing, Locale, Message, Offer } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { StatusBadge } from "@/components/listing/bits";
import { Avatar, Badge, Button, Card, EmptyState } from "@/components/ui";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { TimeAgo } from "./TimeAgo";
import { listingHref } from "@/lib/listing-href";

type Thread = { id: string; subject: string | null; listingId: string | null; participants: { id: string; name: string; hue: number }[]; messages: Message[] };
type Mandate = { id: string; status: "REQUESTED" | "ASSIGNED" | "ACTIVE" | "CANCELLED"; listingId: string | null; agencyName: string; agentName: string | null; createdAt: string };

const MANDATE_LABEL: Record<Mandate["status"], [string, string]> = {
  REQUESTED: ["Solicitado", "Requested"],
  ASSIGNED: ["Agente asignado", "Agent assigned"],
  ACTIVE: ["Publicado", "Live"],
  CANCELLED: ["Cancelado", "Cancelled"],
};
const OFFER_LABEL: Record<Offer["status"], [string, string]> = {
  RECEIVED: ["Recibida", "Received"],
  COUNTERED: ["Contraofertada", "Countered"],
  ACCEPTED: ["Aceptada", "Accepted"],
  REJECTED: ["Rechazada", "Rejected"],
};
const MAX_PRICE = 1_000_000_000;

export function OwnerListingsView({ locale, listings, offers, threads, mandates }: { locale: Locale; listings: Listing[]; offers: Offer[]; threads: Thread[]; mandates: Mandate[] }) {
  const { user } = useApp();
  const router = useRouter();
  const [active, setActive] = useState(threads[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [priceErr, setPriceErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const live = useQuery({ queryKey: ["threads"], queryFn: () => api<{ threads: Thread[] }>("threads"), initialData: { threads }, refetchInterval: 15_000 });
  const thread = live.data.threads.find((t) => t.id === active) ?? live.data.threads[0];
  const other = thread?.participants.find((p) => p.id !== user?.id);

  const stageIdx = { REQUESTED: 0, ASSIGNED: 1, ACTIVE: 2, CANCELLED: -1 };
  const [error, setError] = useState<string | null>(null);
  const act = async (fn: () => Promise<unknown>, key: string) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const priceError = (raw: string, current: number) => {
    const n = Number(raw);
    if (raw.trim() === "" || Number.isNaN(n)) return tx(locale, "Escribe el nuevo precio en USD.", "Enter the new price in USD.");
    if (!Number.isInteger(n)) return tx(locale, "El precio debe ser un número entero, sin decimales.", "The price must be a whole number, no decimals.");
    if (n <= 0) return tx(locale, "El precio debe ser mayor que 0.", "The price must be greater than 0.");
    if (n > MAX_PRICE) return tx(locale, `El precio no puede superar ${money(MAX_PRICE, locale)}.`, `The price can’t exceed ${money(MAX_PRICE, locale)}.`);
    if (n === current) return tx(locale, "Es el mismo precio actual.", "That’s the current price.");
    return null;
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{tx(locale, "Mis inmuebles", "My properties")}</h1>
          <p className="mt-1 text-ink/60">{user?.name} · {tx(locale, "propietario particular", "private owner")}</p>
        </div>
        <Button href={`/${locale}/owner/new`}><Plus size={16} /> {tx(locale, "Publicar otro", "List another")}</Button>
      </div>
      {error && (
        <div className="mt-4 rounded-lg bg-[#B423181A] px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          if (!files.length || !uploadFor) return;
          const fd = new FormData();
          files.forEach((f) => fd.append("files", f));
          await act(async () => {
            const r = await fetch(`/api/v1/listings/${uploadFor}/photos`, { method: "POST", body: fd });
            if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? tx(locale, "No se pudieron subir las fotos.", "Photos could not be uploaded."));
          }, `photos-${uploadFor}`);
          e.target.value = "";
        }}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {mandates.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-display text-lg font-semibold">{tx(locale, `Encargo a ${m.agencyName}`, `Mandate with ${m.agencyName}`)}</div>
                <Badge tone={m.status === "ACTIVE" ? "ok" : m.status === "CANCELLED" ? "danger" : "warn"}>{tx(locale, ...MANDATE_LABEL[m.status])}</Badge>
              </div>
              <div className="mt-1 text-sm text-ink/65">{listings.find((l) => l.id === m.listingId)?.[locale === "es" ? "title_es" : "title_en"]}</div>
              <ol className="mt-5 grid grid-cols-3 gap-2">
                {[
                  [tx(locale, "Solicitado", "Requested"), <TimeAgo key="t" iso={m.createdAt} locale={locale} />],
                  [tx(locale, "Agente asignado", "Agent assigned"), m.agentName ?? "—"],
                  [tx(locale, "Publicado", "Live"), tx(locale, "Tras sesión de fotos", "After photo shoot")],
                ].map(([t, d], i) => (
                  <li key={i}>
                    <div className={cn("h-1.5 rounded-full", i <= stageIdx[m.status] ? "bg-coral" : "bg-black/10")} />
                    <div className="mt-2 flex items-center gap-1.5 font-display text-sm font-semibold">{i <= stageIdx[m.status] ? <Check size={14} className="text-ok" /> : <span className="h-3 w-3 rounded-full border-2 border-black/20" />}{t}</div>
                    <div className="text-xs text-ink/65">{d as React.ReactNode}</div>
                  </li>
                ))}
              </ol>
            </Card>
          ))}

          {listings.length === 0 && <EmptyState icon={<Plus size={20} />} title={tx(locale, "Aún no publicas nada", "Nothing listed yet")} body={tx(locale, "Publica gratis o encárgalo a una agencia verificada.", "List for free or hire a verified agency.")} cta={<Button href={`/${locale}/owner/new`}>{tx(locale, "Publicar", "List a property")}</Button>} />}

          {listings.map((l) => {
            const lo = offers.filter((o) => o.listingId === l.id);
            const isMandate = mandates.some((m) => m.listingId === l.id);
            return (
              <Card key={l.id} className="overflow-hidden">
                <div className="grid sm:grid-cols-[220px_1fr]">
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="aspect-[4/3] h-full w-full" />
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={l.status} locale={locale} />
                      <span className="text-xs font-semibold text-ink/65">{isMandate ? tx(locale, "Encargo", "Mandate") : "FSBO"}</span>
                      <span className="text-xs text-ink/65">· {l.photos?.length ?? 0} {tx(locale, "fotos", "photos")} · {tx(locale, "calidad", "quality")} {l.quality}</span>
                    </div>
                    <Link href={listingHref(locale, l)} className="mt-1 block font-display text-lg font-semibold hover:text-coral">{tx(locale, l.title_es, l.title_en)}</Link>
                    {editing === l.id ? (
                      <form
                        className="mt-2"
                        noValidate
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const msg = priceError(price, l.priceAmount);
                          setPriceErr(msg);
                          if (msg) return;
                          setBusy(`price-${l.id}`);
                          try {
                            await api(`listings/${l.id}`, { method: "PATCH", json: { priceAmount: Number(price) } });
                            setEditing(null);
                            router.refresh();
                          } catch (err) {
                            setPriceErr((err as Error).message);
                          } finally {
                            setBusy(null);
                          }
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_PRICE}
                            step={1}
                            className={cn("h-9 w-40 max-w-full rounded-lg border px-2", priceErr ? "border-danger" : "border-line")}
                            value={price}
                            onChange={(e) => {
                              setPrice(e.target.value);
                              setPriceErr(null);
                            }}
                            aria-label={tx(locale, `Nuevo precio (USD${priceSuffix(l, locale)})`, `New price (USD${priceSuffix(l, locale)})`)}
                            aria-invalid={!!priceErr}
                            aria-describedby={priceErr ? `price-err-${l.id}` : undefined}
                          />
                          <Button size="sm" type="submit" disabled={busy === `price-${l.id}`}>
                            {busy === `price-${l.id}` ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {tx(locale, "Guardar", "Save")}
                          </Button>
                          <Button size="sm" type="button" variant="ghost" onClick={() => { setEditing(null); setPriceErr(null); }}>{tx(locale, "Cancelar", "Cancel")}</Button>
                        </div>
                        {priceErr && <p id={`price-err-${l.id}`} role="alert" className="mt-1 text-xs font-semibold text-danger">{priceErr}</p>}
                      </form>
                    ) : (
                      <div className="text-sm text-ink/65">{l.zone}, {l.city} · {money(l.priceAmount, locale)}{priceSuffix(l, locale)}</div>
                    )}
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      {[[Eye, num(l.stats.impressions, locale), tx(locale, "vistas", "views")], [Heart, l.stats.saves, tx(locale, "guardados", "saves")], [Inbox, l.stats.leads, "leads"], [TrendingDown, `${Math.round(((l.priceAmount - l.estimate.mid) / l.estimate.mid) * 100)} %`, tx(locale, "vs estimado", "vs estimate")]].map(([I, v, t], i) => {
                        const Icon = I as React.ElementType;
                        return (
                          <div key={i} className="rounded-lg bg-ivory py-2">
                            <Icon size={14} className="mx-auto text-ink/65" />
                            <div className="font-display font-semibold">{v as string}</div>
                            <div className="text-[11px] text-ink/65">{t as string}</div>
                          </div>
                        );
                      })}
                    </div>
                    {!isMandate && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditing(l.id); setPrice(String(l.priceAmount)); setPriceErr(null); }}><Pencil size={13} /> {tx(locale, "Cambiar precio", "Change price")}</Button>
                        <Button size="sm" variant="outline" disabled={busy === `photos-${l.id}`} onClick={() => { setUploadFor(l.id); fileRef.current?.click(); }}>
                          {busy === `photos-${l.id}` ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} {tx(locale, "Subir fotos", "Upload photos")}
                        </Button>
                        {(l.status === "ACTIVE" || l.status === "UNDER_OFFER") && (
                          <Button size="sm" variant="outline" onClick={() => act(() => api(`listings/${l.id}`, { method: "PATCH", json: { status: l.listingType.includes("RENT") ? "RENTED" : "SOLD" } }), `sold-${l.id}`)}>
                            {l.listingType.includes("RENT") ? tx(locale, "Marcar alquilado", "Mark rented") : tx(locale, "Marcar vendido", "Mark sold")}
                          </Button>
                        )}
                      </div>
                    )}
                    {lo.length > 0 && (
                      <div className="mt-4 rounded-lg border border-line">
                        <div className="border-b border-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink/65">{tx(locale, "Ofertas recibidas", "Offers received")} · {lo.length}</div>
                        {lo.map((o) => (
                          <div key={o.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                            <span className="font-display text-base font-semibold">{money(o.amount, locale)}</span>
                            <span className="text-ink/65">{o.bidder}</span>
                            <TimeAgo iso={o.createdAt} locale={locale} className="text-ink/65" />
                            <Badge tone={o.status === "ACCEPTED" ? "ok" : o.status === "REJECTED" ? "danger" : o.status === "COUNTERED" ? "warn" : "mist"} className="ml-auto">{tx(locale, ...OFFER_LABEL[o.status])}</Badge>
                            {o.status === "RECEIVED" && !isMandate && (
                              <span className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => act(() => api(`offers/${o.id}`, { method: "PATCH", json: { status: "ACCEPTED" } }), o.id)}>{tx(locale, "Aceptar", "Accept")}</Button>
                                <Button size="sm" variant="ghost" onClick={() => act(() => api(`offers/${o.id}`, { method: "PATCH", json: { status: "REJECTED" } }), o.id)}>{tx(locale, "Rechazar", "Reject")}</Button>
                              </span>
                            )}
                            {o.note && <div className="w-full text-xs text-ink/65">{o.note}</div>}
                          </div>
                        ))}
                        <div className="border-t border-line px-3 py-2 text-[11px] text-ink/65">{tx(locale, "Registro de ofertas. La firma se hace fuera de New Place en v1.", "Offer log. Signing happens outside New Place in v1.")}</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="flex h-[620px] flex-col lg:sticky lg:top-24">
          {thread ? (
            <>
              <div className="flex items-center gap-3 border-b border-line p-4">
                <Avatar initials={(other?.name ?? "?").split(" ").map((p) => p[0]).slice(0, 2).join("")} hue={other?.hue ?? 200} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold">{other?.name ?? "—"}</div>
                  <div className="truncate text-xs text-ink/65">{thread.subject}</div>
                </div>
                {live.data.threads.length > 1 && (
                  <select className="h-8 max-w-[140px] rounded-lg border border-line text-xs" value={thread.id} onChange={(e) => setActive(e.target.value)} aria-label={tx(locale, "Conversación", "Conversation")}>
                    {live.data.threads.map((t) => <option key={t.id} value={t.id}>{t.subject ?? t.id}</option>)}
                  </select>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
                {thread.messages.map((m) => (
                  <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "ml-auto rounded-br-md bg-navy text-ivory" : "rounded-bl-md bg-ivory")}>
                    {m.body}
                    <TimeAgo iso={m.at} locale={locale} className={cn("mt-1 block text-[10px]", m.mine ? "text-mist" : "text-ink/65")} />
                  </div>
                ))}
              </div>
              <form
                className="flex gap-2 border-t border-line p-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  const body = draft;
                  setDraft("");
                  await api(`threads/${thread.id}/messages`, { method: "POST", json: { body } });
                  live.refetch();
                }}
              >
                <input value={draft} onChange={(e) => setDraft(e.target.value)} className="h-10 flex-1 rounded-full border border-line px-4 text-sm focus:border-coral focus:outline-none" placeholder={tx(locale, "Escribe un mensaje…", "Write a message…")} aria-label={tx(locale, "Mensaje", "Message")} />
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-cta text-white" aria-label={tx(locale, "Enviar", "Send")}><Send size={16} /></button>
              </form>
              <div className="pb-2 text-center text-[10px] text-ink/65">{tx(locale, "Inbox interno · se actualiza cada 15 s", "Internal inbox · refreshes every 15 s")}</div>
            </>
          ) : (
            <div className="m-auto p-6 text-center text-sm text-ink/65">{tx(locale, "Cuando un comprador o tu agente te escriba, verás la conversación aquí.", "When a buyer or your agent writes, the conversation shows up here.")}</div>
          )}
        </Card>
      </div>
    </div>
  );
}
