"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Eye, Heart, ImagePlus, Inbox, Loader2, Pencil, Plus, Send, TrendingDown } from "lucide-react";
import type { Listing, Locale, Message, Offer } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { useApp } from "@/lib/store";
import { Empty, StatusPill, k } from "@/components/agency/kit";
import { api } from "@/lib/api";
import { money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { TimeAgo } from "./TimeAgo";
import { listingHref } from "@/lib/listing-href";

type Thread = { id: string; subject: string | null; listingId: string | null; leadId?: string | null; participants: { id: string; name: string; hue: number }[]; messages: Message[] };
type OwnerLead = { id: string; listingId: string; name: string; email: string; phone: string | null; message: string; createdAt: string };
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

export function OwnerListingsView({ locale, listings, offers, threads, mandates, leads = [] }: { locale: Locale; listings: Listing[]; offers: Offer[]; threads: Thread[]; mandates: Mandate[]; leads?: OwnerLead[] }) {
  const { user } = useApp();
  const router = useRouter();
  const [active, setActive] = useState(threads[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatErr, setChatErr] = useState<string | null>(null);
  const [confirmSold, setConfirmSold] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [priceErr, setPriceErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const live = useQuery({ queryKey: ["threads"], queryFn: () => api<{ threads: Thread[] }>("threads"), initialData: { threads }, refetchInterval: 15_000 });
  const thread = live.data.threads.find((t) => t.id === active) ?? live.data.threads[0];
  const other = thread?.participants.find((p) => p.id !== user?.id);
  // An anonymous visitor's enquiry has a thread with nobody else in it: show who wrote and how to reach them.
  const threadLead = thread?.leadId ? leads.find((ld) => ld.id === thread.leadId) : undefined;
  const otherName = other?.name || threadLead?.name || "—";

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
          <div className={k.eyebrow}>{tx(locale, "Vender con nosotros", "Sell with us")}</div>
          <h1 className="mt-1 font-serif text-[40px] font-medium leading-[1.05] md:text-[48px]">{tx(locale, "Mis inmuebles", "My properties")}</h1>
          <p className="mt-1 text-muted">{user?.name} · {tx(locale, "propietario particular", "private owner")}</p>
        </div>
        <Button href={`/${locale}/owner/new`}><Plus size={16} /> {tx(locale, "Publicar otro", "List another")}</Button>
      </div>
      {error && (
        <div className="mt-4 rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger" role="alert">
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
            if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? tx(locale, "No pudimos subir las fotos. Inténtalo otra vez en un momento.", "We couldn’t upload the photos. Please try again in a moment."));
          }, `photos-${uploadFor}`);
          e.target.value = "";
        }}
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {mandates.map((m) => (
            <Card key={m.id} className={cn(k.card, "border-0 p-5")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-serif text-[24px] font-medium leading-tight">{tx(locale, `Encargo a ${m.agencyName}`, `Mandate with ${m.agencyName}`)}</div>
                <Badge tone={m.status === "ACTIVE" ? "ok" : m.status === "CANCELLED" ? "danger" : "warn"}>{tx(locale, ...MANDATE_LABEL[m.status])}</Badge>
              </div>
              <div className="mt-1 text-sm text-muted">{listings.find((l) => l.id === m.listingId)?.[locale === "es" ? "title_es" : "title_en"]}</div>
              <ol className="mt-5 grid grid-cols-3 gap-2">
                {[
                  [tx(locale, "Solicitado", "Requested"), <TimeAgo key="t" iso={m.createdAt} locale={locale} />],
                  [tx(locale, "Agente asignado", "Agent assigned"), m.agentName ?? "—"],
                  [tx(locale, "Publicado", "Live"), tx(locale, "Después de la sesión de fotos", "After the photo shoot")],
                ].map(([t, d], i) => (
                  <li key={i}>
                    <div className={cn("h-1.5 rounded-full", i <= stageIdx[m.status] ? "bg-navy dark:bg-ivory" : "bg-black/10")} />
                    <div className="mt-2 flex items-center gap-1.5 font-display text-sm font-semibold">{i <= stageIdx[m.status] ? <Check size={14} className="text-ok" /> : <span className="h-3 w-3 rounded-full border-2 border-black/20" />}{t}</div>
                    <div className="text-xs text-muted">{d as React.ReactNode}</div>
                  </li>
                ))}
              </ol>
            </Card>
          ))}

          {listings.length === 0 && <Empty title={tx(locale, "Todavía no has publicado nada", "Nothing listed yet")} body={tx(locale, "Publica tu casa gratis o deja que una agencia verificada se encargue.", "List your home for free, or let a verified agency take care of it.")} cta={<Button href={`/${locale}/owner/new`} variant="outline" className={k.outline}>{tx(locale, "Publicar mi casa", "List my home")}</Button>} />}

          {listings.map((l) => {
            const lo = offers.filter((o) => o.listingId === l.id);
            const ll = leads.filter((ld) => ld.listingId === l.id);
            const isMandate = mandates.some((m) => m.listingId === l.id);
            return (
              <Card key={l.id} className={cn(k.card, "border-0 overflow-hidden")}>
                <div className="grid sm:grid-cols-[220px_1fr]">
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="aspect-[4/3] h-full w-full" />
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={l.status} review={l.review} locale={locale} />
                      <span className="text-xs font-semibold text-muted">{isMandate ? tx(locale, "Encargo", "Mandate") : "FSBO"}</span>
                      <span className="text-xs text-muted">· {l.photos?.length ?? 0} {tx(locale, "fotos", "photos")} · {tx(locale, "calidad", "quality")} {l.quality}</span>
                    </div>
                    <Link href={listingHref(locale, l)} className="mt-1 block font-serif text-[24px] font-medium leading-tight underline-offset-4 hover:underline">{tx(locale, l.title_es, l.title_en)}</Link>
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
                          <Button size="sm" type="submit" variant="navy" disabled={busy === `price-${l.id}`}>
                            {busy === `price-${l.id}` ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {tx(locale, "Guardar", "Save")}
                          </Button>
                          <Button size="sm" type="button" variant="ghost" onClick={() => { setEditing(null); setPriceErr(null); }}>{tx(locale, "Cancelar", "Cancel")}</Button>
                        </div>
                        {priceErr && <p id={`price-err-${l.id}`} role="alert" className="mt-1 text-xs font-semibold text-danger">{priceErr}</p>}
                      </form>
                    ) : (
                      <div className="text-sm text-muted">{l.zone}, {l.city} · {money(l.priceAmount, locale)}{priceSuffix(l, locale)}</div>
                    )}
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      {[[Eye, num(l.stats.impressions, locale), tx(locale, "vistas", "views")], [Heart, l.stats.saves, tx(locale, "guardados", "saves")], [Inbox, l.stats.leads, "leads"], [TrendingDown, `${Math.round(((l.priceAmount - l.estimate.mid) / l.estimate.mid) * 100)} %`, tx(locale, "vs estimado", "vs estimate")]].map(([I, v, t], i) => {
                        const Icon = I as React.ElementType;
                        return (
                          <div key={i} className="rounded-lg bg-ivory py-2">
                            <Icon size={14} className="mx-auto text-muted" />
                            <div className="font-display font-semibold">{v as string}</div>
                            <div className="text-[11px] text-muted">{t as string}</div>
                          </div>
                        );
                      })}
                    </div>
                    {!isMandate && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className={k.outline} onClick={() => { setEditing(l.id); setPrice(String(l.priceAmount)); setPriceErr(null); }}><Pencil size={13} /> {tx(locale, "Cambiar precio", "Change price")}</Button>
                        <Button size="sm" variant="outline" className={k.outline} disabled={busy === `photos-${l.id}`} onClick={() => { setUploadFor(l.id); fileRef.current?.click(); }}>
                          {busy === `photos-${l.id}` ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />} {tx(locale, "Subir fotos", "Upload photos")}
                        </Button>
                        {(l.status === "ACTIVE" || l.status === "UNDER_OFFER") &&
                          (confirmSold === l.id ? (
                            // Taking a listing off the market is not undoable from here: ask first.
                            <span className="flex flex-wrap items-center gap-2" role="group" aria-label={tx(locale, "Confirmar", "Confirm")}>
                              <span className="text-sm font-semibold">{l.listingType.includes("RENT") ? tx(locale, "¿Marcar como alquilado? Dejará de aparecer en el buscador.", "Mark as rented? It will no longer appear in search.") : tx(locale, "¿Marcar como vendido? Dejará de aparecer en el buscador.", "Mark as sold? It will no longer appear in search.")}</span>
                              <Button size="sm" variant="navy" disabled={busy === `sold-${l.id}`} onClick={() => act(() => api(`listings/${l.id}`, { method: "PATCH", json: { status: l.listingType.includes("RENT") ? "RENTED" : "SOLD" } }), `sold-${l.id}`).then(() => setConfirmSold(null))}>
                                {busy === `sold-${l.id}` && <Loader2 size={13} className="animate-spin" />} {tx(locale, "Sí, confirmar", "Yes, confirm")}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmSold(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                            </span>
                          ) : (
                            <Button size="sm" variant="outline" className={k.outline} onClick={() => setConfirmSold(l.id)}>
                              {l.listingType.includes("RENT") ? tx(locale, "Marcar alquilado", "Mark rented") : tx(locale, "Marcar vendido", "Mark sold")}
                            </Button>
                          ))}
                      </div>
                    )}
                    {ll.length > 0 && (
                      <div className="mt-4 rounded-lg border border-line" data-testid="owner-leads">
                        <div className="border-b border-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">{tx(locale, "Personas interesadas", "Interested people")} · {ll.length}</div>
                        <ul className="divide-y divide-line">
                          {ll.slice(0, 5).map((ld) => (
                            <li key={ld.id} className="px-3 py-2.5 text-sm">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="font-semibold">{ld.name}</span>
                                <a href={`mailto:${ld.email}`} className="font-semibold text-navy underline decoration-navy/30 underline-offset-4">{ld.email}</a>
                                {ld.phone && <a href={`tel:${ld.phone}`} className="font-semibold text-navy underline decoration-navy/30 underline-offset-4">{ld.phone}</a>}
                                <TimeAgo iso={ld.createdAt} locale={locale} className="ml-auto text-xs text-muted" />
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-ink/70">{ld.message}</p>
                            </li>
                          ))}
                        </ul>
                        {ll.length > 5 && <div className="border-t border-line px-3 py-2 text-[11px] text-muted">{tx(locale, `y ${ll.length - 5} más`, `and ${ll.length - 5} more`)}</div>}
                      </div>
                    )}
                    {lo.length > 0 && (
                      <div className="mt-4 rounded-lg border border-line">
                        <div className="border-b border-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted">{tx(locale, "Ofertas recibidas", "Offers received")} · {lo.length}</div>
                        {lo.map((o) => (
                          <div key={o.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                            <span className="font-display text-base font-semibold">{money(o.amount, locale)}</span>
                            <span className="text-muted">{o.bidder}</span>
                            <TimeAgo iso={o.createdAt} locale={locale} className="text-muted" />
                            <Badge tone={o.status === "ACCEPTED" ? "ok" : o.status === "REJECTED" ? "danger" : o.status === "COUNTERED" ? "warn" : "mist"} className="ml-auto">{tx(locale, ...OFFER_LABEL[o.status])}</Badge>
                            {o.status === "RECEIVED" && !isMandate && (
                              <span className="flex gap-1">
                                <Button size="sm" variant="outline" className={k.outline} disabled={busy === o.id} onClick={() => act(() => api(`offers/${o.id}`, { method: "PATCH", json: { status: "ACCEPTED" } }), o.id)}>{tx(locale, "Aceptar", "Accept")}</Button>
                                <Button size="sm" variant="ghost" disabled={busy === o.id} onClick={() => act(() => api(`offers/${o.id}`, { method: "PATCH", json: { status: "REJECTED" } }), o.id)}>{tx(locale, "Rechazar", "Reject")}</Button>
                              </span>
                            )}
                            {o.note && <div className="w-full text-xs text-muted">{o.note}</div>}
                          </div>
                        ))}
                        <div className="border-t border-line px-3 py-2 text-[11px] text-muted">{tx(locale, "Aquí ves cada oferta. Por ahora, la firma se hace fuera de New Place.", "Every offer, in one place. For now, signing happens outside New Place.")}</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className={cn(k.card, "border-0 flex h-[620px] flex-col lg:sticky lg:top-24")}>
          {thread ? (
            <>
              <div className="flex items-center gap-3 border-b border-line p-4">
                <Avatar initials={otherName.split(" ").map((p) => p[0]).slice(0, 2).join("")} hue={other?.hue ?? 200} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold">{otherName}</div>
                  <div className="truncate text-xs text-muted">{thread.subject}</div>
                </div>
                {live.data.threads.length > 1 && (
                  <select className="h-8 max-w-[160px] rounded-lg border border-line text-xs" value={thread.id} onChange={(e) => setActive(e.target.value)} aria-label={tx(locale, "Conversación", "Conversation")}>
                    {live.data.threads.map((t) => {
                      // Several buyers write about the same listing: name who is on the other side, then the subject.
                      const who = t.participants.filter((p) => p.id !== user?.id).map((p) => p.name).join(", ") || leads.find((ld) => ld.id === t.leadId)?.name;
                      return <option key={t.id} value={t.id}>{[who, t.subject].filter(Boolean).join(" · ") || tx(locale, "Conversación", "Conversation")}</option>;
                    })}
                  </select>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
                {threadLead && !other && (
                  <div className="rounded-2xl rounded-bl-md bg-ivory px-3.5 py-2 text-sm">
                    <div className="text-xs font-semibold text-ink/70">{threadLead.name} · {threadLead.email}{threadLead.phone ? ` · ${threadLead.phone}` : ""}</div>
                    <div className="whitespace-pre-wrap">{threadLead.message}</div>
                    <TimeAgo iso={threadLead.createdAt} locale={locale} className="mt-1 block text-[10px] text-muted" />
                  </div>
                )}
                {thread.messages.map((m) => (
                  <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "ml-auto rounded-br-md bg-navy text-ivory" : "rounded-bl-md bg-ivory")}>
                    {m.body}
                    <TimeAgo iso={m.at} locale={locale} className={cn("mt-1 block text-[10px]", m.mine ? "text-mist" : "text-muted")} />
                  </div>
                ))}
              </div>
              {threadLead && !other ? (
                <div className="border-t border-line p-3 text-center text-sm text-muted">
                  {tx(locale, "Te escribió sin crear una cuenta. Respóndele por email o teléfono.", "They wrote without an account. Reply by email or phone.")}{" "}
                  <a href={`mailto:${threadLead.email}`} className="font-semibold font-semibold text-navy underline decoration-navy/30 underline-offset-4">{tx(locale, "Responder por email", "Reply by email")}</a>
                </div>
              ) : (
              <form
                className="flex gap-2 border-t border-line p-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const body = draft.trim();
                  if (!body || sending) return;
                  setSending(true);
                  setChatErr(null);
                  try {
                    await api(`threads/${thread.id}/messages`, { method: "POST", json: { body } });
                    setDraft("");
                    await live.refetch();
                  } catch (err) {
                    // Keep what was typed so it can be re-sent.
                    setChatErr((err as Error).message);
                  } finally {
                    setSending(false);
                  }
                }}
              >
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000} className="h-11 min-w-0 flex-1 rounded-full border border-[#D8CBB7] bg-white px-4 text-sm focus:border-navy focus:outline-none" placeholder={tx(locale, "Escribe un mensaje…", "Write a message…")} aria-label={tx(locale, "Mensaje", "Message")} />
                <button disabled={sending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy text-ivory hover:bg-navy-2 disabled:opacity-60 dark:bg-ivory dark:text-navy" aria-label={tx(locale, "Enviar", "Send")}>{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
              </form>
              )}
              {chatErr && <div role="alert" className="mx-3 mb-2 rounded-lg bg-[#B3261E1A] px-3 py-2 text-xs text-danger">{chatErr}</div>}
              <div className="pb-2 text-center text-[10px] text-muted">{tx(locale, "Tus mensajes · se actualizan cada 15 s", "Your messages · refresh every 15 s")}</div>
            </>
          ) : (
            <div className="m-auto p-6 text-center text-sm text-muted">{tx(locale, "Cuando un comprador o tu agente te escriba, verás la conversación aquí.", "When a buyer or your agent writes, the conversation shows up here.")}</div>
          )}
        </Card>
      </div>
    </div>
  );
}
