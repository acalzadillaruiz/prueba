"use client";

import { useState } from "react";
import Link from "next/link";
import { HandCoins, Loader2 } from "lucide-react";
import { offerSchema } from "@newplace/config";
import type { Listing, Locale } from "@/types/domain";
import { Badge, Button, Card, inputCls } from "@/components/ui";
import { Empty, k } from "@/components/agency/kit";
import { api } from "@/lib/api";
import { ago, money, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export type HubOffer = { id: string; listingId: string; amount: number; status: "RECEIVED" | "COUNTERED" | "ACCEPTED" | "REJECTED"; note: string | null; createdAt: string };

const STATUS: Record<HubOffer["status"], { es: string; en: string; tone: "warn" | "gold" | "ok" | "danger" }> = {
  RECEIVED: { es: "Enviada", en: "Sent", tone: "warn" },
  COUNTERED: { es: "Contraoferta", en: "Countered", tone: "gold" },
  ACCEPTED: { es: "Aceptada", en: "Accepted", tone: "ok" },
  REJECTED: { es: "Rechazada", en: "Rejected", tone: "danger" },
};

/** Make an offer on a listing the buyer already contacted (lead or tour) and follow its status. */
export function HubOffers({ id, className, locale, offers: initial, offerable, listingById, onChange }: { id?: string; className?: string; locale: Locale; offers: HubOffer[]; offerable: string[]; listingById: (id: string) => Listing | undefined; onChange?: (n: number) => void }) {
  const [offers, setOffers] = useState(initial);
  const [listingId, setListingId] = useState(offerable[0] ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<{ listing?: string; amount?: string; note?: string; form?: string }>({});
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setSent(false);
    const e: typeof errors = {};
    if (!listingId) e.listing = tx(locale, "Elige la casa sobre la que quieres ofertar.", "Choose the home you’d like to make an offer on.");
    const parsed = offerSchema.safeParse({ amount: Number(amount), note: note.trim() || undefined });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      if (f.amount || !amount) e.amount = tx(locale, "Escribe un monto en USD mayor que 0 (sin decimales).", "Enter a USD amount above 0 (no decimals).");
      if (f.note) e.note = tx(locale, "La nota puede tener hasta 500 caracteres.", "The note can be up to 500 characters.");
    }
    setErrors(e);
    if (Object.keys(e).length || !parsed.success) return;
    setBusy(true);
    try {
      const o = await api<HubOffer & { createdAt: string }>(`listings/${listingId}/offers`, { method: "POST", json: parsed.data });
      const next = [{ id: o.id, listingId: o.listingId, amount: o.amount, status: o.status, note: o.note, createdAt: o.createdAt }, ...offers];
      setOffers(next);
      onChange?.(next.length);
      setAmount("");
      setNote("");
      setSent(true);
    } catch (err) {
      setErrors({ form: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const listingTitle = (id: string) => {
    const l = listingById(id);
    return l ? tx(locale, l.title_es, l.title_en) : tx(locale, "Inmueble", "Property");
  };

  return (
    <div id={id} className={cn("lg:col-span-2", className)}>
    <Card className={cn(k.card, "h-full border-0 p-5")}>
      <h2 className="flex items-center gap-2 font-serif text-[24px] font-medium leading-tight"><HandCoins size={18} strokeWidth={1.6} className="text-navy/70 dark:text-ivory/70" /> {tx(locale, "Mis ofertas", "My offers")}</h2>

      {offerable.length > 0 ? (
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]"
          noValidate
          onSubmit={(ev) => {
            ev.preventDefault();
            void submit();
          }}
        >
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-semibold">{tx(locale, "Inmueble", "Property")}</span>
            <select value={listingId} onChange={(ev) => setListingId(ev.target.value)} className={cn(inputCls, "h-11")} aria-invalid={!!errors.listing}>
              {offerable.map((id) => {
                const l = listingById(id);
                return (
                  <option key={id} value={id}>
                    {listingTitle(id)}{l ? ` · ${money(l.priceAmount, locale)}` : ""}
                  </option>
                );
              })}
            </select>
            {errors.listing && <span role="alert" className="mt-1 block text-xs font-semibold text-danger">{errors.listing}</span>}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">{tx(locale, "Nota para el agente (opcional)", "Note for the agent (optional)")}</span>
            <input value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={500} className={cn(inputCls, "h-11")} aria-invalid={!!errors.note} placeholder={tx(locale, "Ej.: pago de contado, entrega en 60 días", "E.g. cash, closing in 60 days")} />
            {errors.note && <span role="alert" className="mt-1 block text-xs font-semibold text-danger">{errors.note}</span>}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">{tx(locale, "Monto (USD)", "Amount (USD)")}</span>
            <input value={amount} onChange={(ev) => setAmount(ev.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className={cn(inputCls, "h-11")} aria-invalid={!!errors.amount} placeholder={listingById(listingId) ? String(listingById(listingId)!.priceAmount) : "150000"} />
            {errors.amount && <span role="alert" className="mt-1 block text-xs font-semibold text-danger">{errors.amount}</span>}
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy} className="w-full sm:w-auto">
              {busy && <Loader2 size={16} className="animate-spin" />} {tx(locale, "Enviar oferta", "Send offer")}
            </Button>
            {sent && <span role="status" className="ml-0 mt-2 block text-sm font-semibold text-ok sm:ml-3 sm:mt-0 sm:inline">{tx(locale, "Listo. Tu oferta ya está con el agente.", "Done. Your offer is with the agent now.")}</span>}
          </div>
          {errors.form && <div role="alert" className="rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger sm:col-span-2">{errors.form}</div>}
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted">{tx(locale, "Para hacer una oferta, primero escríbele al agente o pide una visita desde la casa que te interesa.", "To make an offer, first message the agent or book a tour from the home you like.")}</p>
      )}

      <div className="mt-5">
        {offers.length === 0 ? (
          <Empty className="py-6" title={tx(locale, "Aún no has hecho ofertas", "No offers yet")} body={tx(locale, "Cuando hagas una, podrás seguir aquí cómo avanza.", "When you make one, you can follow how it’s going right here.")} />
        ) : (
          <ul className="divide-y divide-line" aria-label={tx(locale, "Ofertas enviadas", "Offers sent")}>
            {offers.map((o) => {
              const l = listingById(o.listingId);
              const st = STATUS[o.status];
              return (
                <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <div className="min-w-0 flex-1">
                    {l ? (
                      <Link href={`/${locale}/listing/${l.slug}`} className="line-clamp-1 font-semibold hover:underline">{listingTitle(o.listingId)}</Link>
                    ) : (
                      <div className="line-clamp-1 font-semibold">{listingTitle(o.listingId)}</div>
                    )}
                    <div className="text-sm text-muted">{ago(o.createdAt, locale)}{o.note ? ` · ${o.note}` : ""}</div>
                  </div>
                  <div className="font-display font-semibold">{money(o.amount, locale)}</div>
                  <Badge tone={st.tone}>{tx(locale, st.es, st.en)}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
    </div>
  );
}
