"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Eye, Heart, Inbox, Plus, Send, TrendingDown } from "lucide-react";
import type { Locale } from "@/types/domain";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { StatusBadge } from "@/components/listing/bits";
import { Avatar, Badge, Button, Card } from "@/components/ui";
import { LISTINGS } from "@/mock/listings";
import { OFFERS, OWNER_THREAD } from "@/mock/ops";
import { ago, money, num, priceSuffix, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export function OwnerListingsView({ locale }: { locale: Locale }) {
  const mine = LISTINGS.filter((l) => l.ownerUserId === "u-priv");
  const mandate = mine.find((l) => l.city === "Barquisimeto")!;
  const [msgs, setMsgs] = useState(OWNER_THREAD);
  const [draft, setDraft] = useState("");
  const stages = [
    ["REQUESTED", tx(locale, "Solicitado", "Requested"), tx(locale, "hace 3 d", "3 d ago")],
    ["ASSIGNED", tx(locale, "Agente asignado", "Agent assigned"), "Valentina Rojas"],
    ["ACTIVE", tx(locale, "Publicado", "Live"), tx(locale, "Tras sesión de fotos", "After photo shoot")],
  ];
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{tx(locale, "Mis inmuebles", "My properties")}</h1>
          <p className="mt-1 text-ink/60">Isabel Contreras · {tx(locale, "propietaria particular", "private owner")}</p>
        </div>
        <Button href={`/${locale}/owner/new`}><Plus size={16} /> {tx(locale, "Publicar otro", "List another")}</Button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display text-lg font-semibold">{tx(locale, "Encargo a Andes Prime", "Mandate with Andes Prime")}</div>
              <Badge tone="warn">ASSIGNED</Badge>
            </div>
            <div className="mt-1 text-sm text-ink/55">{tx(locale, mandate.title_es, mandate.title_en)} · {mandate.city}</div>
            <ol className="mt-5 grid grid-cols-3 gap-2">
              {stages.map(([k, t, d], i) => (
                <li key={k}>
                  <div className={cn("h-1.5 rounded-full", i <= 1 ? "bg-coral" : "bg-black/10")} />
                  <div className="mt-2 flex items-center gap-1.5 font-display text-sm font-semibold">{i <= 1 ? <Check size={14} className="text-ok" /> : <span className="h-3 w-3 rounded-full border-2 border-black/20" />}{t}</div>
                  <div className="text-xs text-ink/55">{d}</div>
                </li>
              ))}
            </ol>
          </Card>

          {mine.map((l) => {
            const offers = OFFERS.filter((o) => o.listingId === l.id);
            return (
              <Card key={l.id} className="overflow-hidden">
                <div className="grid sm:grid-cols-[220px_1fr]">
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="aspect-[4/3] h-full w-full" />
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={l.status} locale={locale} />
                      <span className="text-xs font-semibold text-ink/50">{l.city === "Barquisimeto" ? tx(locale, "Encargo", "Mandate") : "FSBO"}</span>
                    </div>
                    <Link href={`/${locale}/listing/${l.slug}`} className="mt-1 block font-display text-lg font-semibold hover:text-coral">{tx(locale, l.title_es, l.title_en)}</Link>
                    <div className="text-sm text-ink/55">{l.zone}, {l.city} · {money(l.priceAmount, locale)}{priceSuffix(l, locale)}</div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                      {[[Eye, num(l.stats.impressions, locale), tx(locale, "vistas", "views")], [Heart, l.stats.saves, tx(locale, "guardados", "saves")], [Inbox, l.stats.leads, "leads"], [TrendingDown, `${Math.round(((l.priceAmount - l.estimate.mid) / l.estimate.mid) * 100)} %`, tx(locale, "vs estimado", "vs estimate")]].map(([I, v, t], i) => {
                        const Icon = I as React.ElementType;
                        return (
                          <div key={i} className="rounded-lg bg-ivory py-2">
                            <Icon size={14} className="mx-auto text-ink/45" />
                            <div className="font-display font-semibold">{v as string}</div>
                            <div className="text-[11px] text-ink/50">{t as string}</div>
                          </div>
                        );
                      })}
                    </div>
                    {offers.length > 0 && (
                      <div className="mt-4 rounded-lg border border-line">
                        <div className="border-b border-line px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink/55">{tx(locale, "Ofertas recibidas", "Offers received")} · {offers.length}</div>
                        {offers.map((o) => (
                          <div key={o.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                            <span className="font-display text-base font-semibold">{money(o.amount, locale)}</span>
                            <span className="text-ink/55">{o.bidder}</span>
                            <span className="text-ink/45">{ago(o.createdAt, locale)}</span>
                            <Badge tone={o.status === "COUNTERED" ? "warn" : "mist"} className="ml-auto">{o.status}</Badge>
                            <div className="w-full text-xs text-ink/55">{o.note}</div>
                          </div>
                        ))}
                        <div className="border-t border-line px-3 py-2 text-[11px] text-ink/45">{tx(locale, "Registro de ofertas. La firma se hace fuera de New Place en v1.", "Offer log. Signing happens outside New Place in v1.")}</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="flex h-[620px] flex-col lg:sticky lg:top-24">
          <div className="flex items-center gap-3 border-b border-line p-4">
            <Avatar initials="VR" hue={340} size={40} />
            <div>
              <div className="font-display font-semibold">Valentina Rojas</div>
              <div className="text-xs text-ink/55">Andes Prime · {tx(locale, "agente asignado", "assigned agent")}</div>
            </div>
            <span className="ml-auto flex items-center gap-1 text-xs text-ok"><span className="h-2 w-2 rounded-full bg-ok" /> {tx(locale, "en línea", "online")}</span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
            {msgs.map((m) => (
              <div key={m.id} className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm", m.mine ? "ml-auto rounded-br-md bg-navy text-ivory" : "rounded-bl-md bg-ivory")}>
                {m.body}
                <div className={cn("mt-1 text-[10px]", m.mine ? "text-mist" : "text-ink/40")}>{ago(m.at, locale)}</div>
              </div>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft) return;
              setMsgs([...msgs, { id: String(Date.now()), from: "Isabel", body: draft, at: new Date("2026-09-26T18:00:00Z").toISOString(), mine: true }]);
              setDraft("");
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} className="h-10 flex-1 rounded-full border border-line px-4 text-sm focus:border-coral focus:outline-none" placeholder={tx(locale, "Escribe un mensaje…", "Write a message…")} />
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-coral text-white"><Send size={16} /></button>
          </form>
          <div className="pb-2 text-center text-[10px] text-ink/40">{tx(locale, "Inbox interno · se actualiza cada 15 s", "Internal inbox · refreshes every 15 s")}</div>
        </Card>
      </div>
    </div>
  );
}
