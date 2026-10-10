"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSignature, Filter, Pause, Pencil, Play, Plus, Rocket, UserPlus, X, XCircle } from "lucide-react";
import type { Locale } from "@/types/domain";
import { AdminShell } from "@/components/layout/AdminShell";
import { listingPhoto } from "@/lib/photos";
import { PropertyArt } from "@/components/art/PropertyArt";
import { Button } from "@/components/ui";
import { Count, Initials, Pill, Select, StatusPill, k, tab } from "./kit";
import { ScrollRegion } from "./ScrollRegion";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import type { Listing } from "@/types/domain";
import { TYPE_LABEL, lbl, money, num, priceSuffix, tx } from "@/lib/i18n";
import { TimeAgo } from "@/components/owner/TimeAgo";
import { LISTING_PHASE_PLURAL, MANDATE_PHASE, canActivate, canPause, listingPhase, mandateHint, mandateLabel, mandatePhase, type ListingPhase } from "@/lib/lifecycle";
import { cn } from "@/lib/cn";
import { BulkResult, runSequential, type Bulk } from "./bulk";

export type MandateRow = {
  id: string;
  status: "REQUESTED" | "ASSIGNED";
  agentId: string | null;
  ownerName: string;
  createdAt: string;
  updatedAt?: string;
  listing: { id: string; title_es: string; title_en: string; zone: string; city: string; priceAmount: number; updatedAt?: string } | null;
};

type TabKey = "ALL" | "REVIEW" | ListingPhase;
const TAB_PHASES: ListingPhase[] = ["PUBLISHED", "UNDER_OFFER", "COMING_SOON", "PAUSED", "SOLD", "RENTED", "DRAFT", "REJECTED"];

export function ListingsTable({ locale, listings, agents, mandates = [] }: { locale: Locale; listings: Listing[]; agents: { id: string; name: string; hue: number }[]; mandates?: MandateRow[] }) {
  const router = useRouter();
  const { user } = useApp();
  const manager = user?.role === "AGENCY_OWNER" || user?.role === "BACKOFFICE" || user?.role === "SUPERADMIN";
  // Bulk selection: managers (any listing) and agents (their own listings, which is all this page shows them).
  const selectable = manager || user?.role === "AGENT";
  const [status, setStatus] = useState<TabKey>("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<Bulk | null>(null);
  const norm = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const mine = q ? listings.filter((l) => norm(`${l.title_es} ${l.title_en} ${l.zone} ${l.city} ${l.address} ${l.agent?.name ?? ""}`).includes(norm(q))) : listings;
  // A listing tied to an open owner mandate follows the mandate's lifecycle (one state, one next action).
  const mandateOf = new Map(mandates.filter((m) => m.listing).map((m) => [m.listing!.id, m]));
  const mPhase = (m: MandateRow) => mandatePhase(m, m.listing?.updatedAt);
  const canPublishMandate = (m: MandateRow) => m.status === "ASSIGNED" && (manager || (user?.role === "AGENT" && m.agentId === user.id));
  const patch = async (id: string, json: object, path = `listings/${id}`) => {
    setBusy(id);
    setError(null);
    try {
      await api(path, { method: "PATCH", json });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const assign = (l: Listing, agentId: string | null) => {
    const m = mandateOf.get(l.id);
    // Mandate listings are reassigned through the mandate so both stay in sync.
    return m && agentId ? patch(l.id, { agentId }, `mandates/${m.id}`) : patch(l.id, { agentId });
  };
  const inReview = (l: Listing) => !mandateOf.has(l.id) && listingPhase(l) === "IN_REVIEW";
  const toApprove = (l: Listing) => inReview(l) || (!!mandateOf.get(l.id) && canPublishMandate(mandateOf.get(l.id)!));
  const reviewCount = mine.filter(toApprove).length;
  const rows = mine.filter((l) => status === "ALL" || (status === "REVIEW" ? toApprove(l) : !mandateOf.has(l.id) && listingPhase(l) === status));
  const tabs: [TabKey, string][] = [["ALL", tx(locale, "Todos", "All")], ["REVIEW", tx(locale, "Por aprobar", "To approve")], ...TAB_PHASES.map((p): [TabKey, string] => [p, lbl(LISTING_PHASE_PLURAL[p], locale)])];

  // Selection only ever holds visible rows: changing the filter or the search drops what is no longer shown.
  const visibleIds = rows.map((l) => l.id);
  const visibleKey = visibleIds.join(",");
  useEffect(() => {
    setPicked((cur) => {
      const keep = new Set([...cur].filter((id) => visibleKey.split(",").includes(id)));
      return keep.size === cur.size ? cur : keep;
    });
  }, [visibleKey]);
  const chosen = rows.filter((l) => picked.has(l.id));
  const allOn = rows.length > 0 && chosen.length === rows.length;
  const someOn = chosen.length > 0 && !allOn;
  const toggle = (id: string) => setPicked((cur) => {
    const n = new Set(cur);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const toggleAll = () => setPicked(allOn ? new Set() : new Set(visibleIds));

  /** Runs the same PATCH endpoints as the single-row actions, one listing at a time (same permission checks), with progress. */
  const runBulk = async (label: string, targets: Listing[], call: (l: Listing) => Promise<unknown> | null) => {
    setError(null);
    const ok = await runSequential(label, targets, (l) => tx(locale, l.title_es, l.title_en), call, setBulk);
    // Keep the ones that failed selected so they can be retried.
    setPicked((cur) => new Set([...cur].filter((id) => !ok.includes(id))));
    router.refresh();
  };
  const bulkAssign = (agentId: string) => {
    const name = agents.find((a) => a.id === agentId)?.name ?? "";
    runBulk(tx(locale, `Asignar a ${name}`, `Assign to ${name}`), chosen, (l) => {
      if (l.agentId === agentId) return null;
      const m = mandateOf.get(l.id);
      return m ? api(`mandates/${m.id}`, { method: "PATCH", json: { agentId } }) : api(`listings/${l.id}`, { method: "PATCH", json: { agentId } });
    });
  };
  const approvable = chosen.filter(inReview);
  const pausable = chosen.filter((l) => !mandateOf.has(l.id) && canPause(l));
  const activable = chosen.filter((l) => !mandateOf.has(l.id) && canActivate(l));

  const reviewActions = (l: Listing, title: string, compact: boolean) => {
    const m = mandateOf.get(l.id);
    if (m) {
      if (!canPublishMandate(m)) return null;
      return (
        <Button size="sm" variant="navy" className={cn(k.navy, !compact && "min-h-10")} disabled={busy === m.id} onClick={() => patch(m.id, { status: "ACTIVE" }, `mandates/${m.id}`)} title={tx(locale, "Aprueba la ficha del encargo y la publica en el portal", "Approves the mandate's listing and publishes it")} aria-label={tx(locale, `Revisar y publicar ${title}`, `Review and publish ${title}`)}>
          <Rocket size={14} /> {compact ? tx(locale, "Publicar", "Publish") : tx(locale, "Revisar y publicar", "Review & publish")}
        </Button>
      );
    }
    if (!inReview(l) || !manager) return null;
    return (
      <div className={cn("flex gap-1", compact ? "flex-nowrap items-center" : "flex-wrap")}>
        <Button size="sm" variant="navy" className={cn(k.navy, !compact && "min-h-10")} disabled={busy === l.id} onClick={() => patch(l.id, { review: "APPROVED" })}><CheckCircle2 size={14} /> {tx(locale, "Aprobar", "Approve")}</Button>
        {compact ? (
          <Button size="sm" variant="ghost" className={k.ghost} disabled={busy === l.id} onClick={() => patch(l.id, { review: "REJECTED" })} aria-label={tx(locale, "Rechazar publicación", "Reject listing")} title={tx(locale, "Rechazar publicación", "Reject listing")}><XCircle size={14} /></Button>
        ) : (
          <Button size="sm" variant="ghost" className={cn(k.ghost, "min-h-10")} disabled={busy === l.id} onClick={() => patch(l.id, { review: "REJECTED" })} aria-label={tx(locale, `Rechazar publicación de ${title}`, `Reject listing ${title}`)}><XCircle size={14} /> {tx(locale, "Rechazar", "Reject")}</Button>
        )}
      </div>
    );
  };
  const statusPills = (l: Listing, stacked = false) => {
    const m = mandateOf.get(l.id);
    if (m) {
      const p = mPhase(m);
      // Table: "Encargo" as a small kicker over the phase pill, so the Estado column stays as narrow as a single pill.
      if (stacked) return <span className="flex flex-col items-start gap-0.5"><span className={cn("text-[11px] font-semibold", k.muted)}>{tx(locale, "Encargo", "Mandate")}</span><Pill tone={MANDATE_PHASE[p].tone}><span title={mandateHint(p, locale)}>{mandateLabel(p, locale)}</span></Pill></span>;
      return <Pill tone={MANDATE_PHASE[p].tone}><span title={mandateHint(p, locale)}>{tx(locale, "Encargo", "Mandate")} · {mandateLabel(p, locale)}</span></Pill>;
    }
    return <StatusPill status={l.status} review={l.review} takedownReason={l.takedownReason} locale={locale} />;
  };
  const agentSelect = (l: Listing, label: string, wrapClassName?: string, className?: string) => (
    <Select compact wrapClassName={wrapClassName} className={className} value={l.agentId ?? ""} disabled={!manager || busy === l.id} onChange={(e) => assign(l, e.target.value || null)} aria-label={label}>
      <option value="" disabled={mandateOf.has(l.id)}>—</option>
      {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
    </Select>
  );
  /** Price and agent get their own columns from xl; below it (1024 beside the sidebar, tablets) they stack in the listing cell. */
  const xlCol = "hidden xl:table-cell";
  const box = "h-[18px] w-[18px] shrink-0 cursor-pointer accent-navy dark:accent-[#9CC3CC]";
  const qualityBar = (l: Listing, w: string) => <span className={cn("inline-block h-1.5 rounded-full bg-[#E6DFD3] dark:bg-white/10", w)} aria-hidden><span className={cn("block h-full rounded-full", l.quality >= 85 ? "bg-ok" : l.quality >= 65 ? "bg-warn" : "bg-danger")} style={{ width: `${l.quality}%` }} /></span>;
  /** Columns that only fit from 2xl (≥ 1536 px); below it they ride on a meta line under the title. */
  const wide = "hidden 2xl:table-cell";

  return (
    <AdminShell locale={locale} area="agency" title={tx(locale, "Inmuebles", "Listings")} actions={user?.role !== "PHOTOGRAPHER" && user?.role !== "CAPTOR" ? <Button className={k.primary} href={`/${locale}/agency/listings/new`}><Plus size={16} /> {tx(locale, "Nuevo inmueble", "New listing")}</Button> : undefined}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        {/* Phones: one horizontally scrolling row (snap + faded edges) instead of 10 chips wrapping onto 4 rows. */}
        <div
          role="group"
          aria-label={tx(locale, "Filtrar por estado", "Filter by status")}
          data-testid="status-chips"
          className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 py-0.5 [mask-image:linear-gradient(to_right,transparent,#000_14px,#000_calc(100%-28px),transparent)] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map(([key, t]) => (
            <button
              key={key}
              onClick={(e) => {
                setStatus(key);
                e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
              }}
              aria-pressed={status === key}
              className={cn(tab(status === key), "shrink-0 snap-start whitespace-nowrap max-sm:min-h-10")}
            >
              {t} {key === "REVIEW" && <Count>{reviewCount}</Count>}
            </button>
          ))}
        </div>
        <label className="relative w-full sm:ml-auto sm:w-72">
          <Filter size={14} className={cn("absolute left-3.5 top-1/2 -translate-y-1/2", k.muted)} aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tx(locale, "Buscar título, zona, agente…", "Search title, area, agent…")} aria-label={tx(locale, "Buscar inmuebles", "Search listings")} className={cn(k.input, "rounded-full pl-10")} />
        </label>
      </div>
      {error && <div className={cn("mb-3", k.err)} role="alert">{error}</div>}
      {mandates.length > 0 && (
        <section className={cn(k.card, "mb-6 p-5 md:p-6")} aria-labelledby="mandates-title" data-testid="mandates">
          <h2 id="mandates-title" className={cn(k.title, "mb-1 flex items-center gap-2.5")}><FileSignature size={18} strokeWidth={1.6} className="text-gold-text dark:text-[#C9B49C]" /> {tx(locale, "Encargos de propietarios", "Owner mandates")} <Count>{mandates.length}</Count></h2>
          <p className={cn("mb-3 text-[13px]", k.muted)}>{tx(locale, "Solicitado → Asignado → En preparación → Publicado. Asigna un agente y, cuando la ficha esté lista, revísala y publícala en un solo paso.", "Requested → Assigned → In preparation → Published. Assign an agent and, when the listing is ready, review and publish it in one step.")}</p>
          <div className={cn("divide-y", k.divide)}>
            {mandates.map((m) => {
              const title = m.listing ? tx(locale, m.listing.title_es, m.listing.title_en) : "—";
              const p = mPhase(m);
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm" data-mandate={m.id}>
                  <div className="min-w-0 flex-1 basis-60">
                    {m.status === "ASSIGNED" && m.listing ? <Link href={`/${locale}/agency/listings/${m.listing.id}/edit`} className="line-clamp-1 font-semibold underline-offset-4 hover:underline">{title}</Link> : <div className="line-clamp-1 font-semibold">{title}</div>}
                    <div className={cn("text-xs", k.muted)}>{m.ownerName}{m.listing ? ` · ${m.listing.zone}, ${m.listing.city} · ${money(m.listing.priceAmount, locale)}` : ""} · <TimeAgo iso={m.createdAt} locale={locale} /></div>
                  </div>
                  <Pill tone={MANDATE_PHASE[p].tone}><span title={mandateHint(p, locale)}>{mandateLabel(p, locale)}</span></Pill>
                  {manager && (
                    <Select compact value={m.agentId ?? ""} disabled={busy === m.id} onChange={(e) => e.target.value && patch(m.id, { agentId: e.target.value }, `mandates/${m.id}`)} aria-label={tx(locale, `Agente del encargo ${title}`, `Agent for mandate ${title}`)}>
                      <option value="" disabled>{tx(locale, "Asignar agente…", "Assign agent…")}</option>
                      {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                    </Select>
                  )}
                  {canPublishMandate(m) && (
                    <Button size="sm" variant="navy" className={k.navy} disabled={busy === m.id} onClick={() => patch(m.id, { status: "ACTIVE" }, `mandates/${m.id}`)} title={tx(locale, "Aprueba la ficha del encargo y la publica en el portal", "Approves the mandate's listing and publishes it")}><Rocket size={14} /> {tx(locale, "Revisar y publicar", "Review & publish")}</Button>
                  )}
                  {manager && declineId !== m.id && (
                    <Button size="sm" variant="ghost" className={k.ghost} disabled={busy === m.id} onClick={() => setDeclineId(m.id)} aria-label={tx(locale, `Rechazar encargo ${title}`, `Decline mandate ${title}`)}><XCircle size={14} /> {tx(locale, "Rechazar", "Decline")}</Button>
                  )}
                  {manager && declineId === m.id && (
                    <span role="group" aria-label={tx(locale, "Confirmar rechazo", "Confirm decline")} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{tx(locale, "¿Rechazar este encargo? El propietario dejará de verlo como activo.", "Decline this mandate? The owner will no longer see it as active.")}</span>
                      <Button size="sm" variant="navy" className={k.navy} disabled={busy === m.id} onClick={() => { setDeclineId(null); patch(m.id, { status: "CANCELLED" }, `mandates/${m.id}`); }}>{tx(locale, "Sí, rechazar", "Yes, decline")}</Button>
                      <Button size="sm" variant="ghost" className={k.ghost} onClick={() => setDeclineId(null)}>{tx(locale, "Cancelar", "Cancel")}</Button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      {selectable && rows.length > 0 && (
        <label className={cn("mb-3 inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-sm md:hidden", k.muted)}>
          <SelectAll className={box} checked={allOn} indeterminate={someOn} onChange={toggleAll} label={tx(locale, `Seleccionar los ${rows.length} visibles`, `Select all ${rows.length} visible`)} />
          {tx(locale, `Seleccionar los ${rows.length} visibles`, `Select all ${rows.length} visible`)}
        </label>
      )}
      {/* Phones: one card per listing (every column + the row actions stay visible). Tablets and up: the table. */}
      <ul className="space-y-3 md:hidden" aria-label={tx(locale, "Inmuebles", "Listings")}>
        {rows.map((l) => {
          const title = tx(locale, l.title_es, l.title_en);
          const edit = `/${locale}/agency/listings/${l.id}/edit`;
          return (
            <li key={l.id} className={cn(k.card, "p-4", picked.has(l.id) && "ring-2 ring-navy/70 dark:ring-[#9CC3CC]/70")} data-listing={l.id}>
              <div className="flex items-start gap-3">
                {selectable && <input type="checkbox" className={cn(box, "mt-1")} checked={picked.has(l.id)} onChange={() => toggle(l.id)} aria-label={tx(locale, `Seleccionar ${title}`, `Select ${title}`)} />}
                <Link href={edit} className="flex min-w-0 flex-1 items-start gap-3">
                  <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-[68px] w-[88px] shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 font-semibold leading-snug">{title}</div>
                    <div className={cn("mt-0.5 text-xs", k.muted)}>{lbl(TYPE_LABEL[l.listingType], locale)} · {l.zone} · {num(l.areaM2, locale)} m²</div>
                    <div className={cn("mt-1 text-[17px] leading-tight", k.num, "tracking-normal")}>{money(l.priceAmount, locale)}<span className={cn("text-xs font-normal", k.muted)}>{priceSuffix(l, locale)}</span></div>
                  </div>
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {statusPills(l)}
                {l.luxury && <Pill tone="exclusive">{tx(locale, "Exclusiva", "Exclusive")}</Pill>}
                <span className={cn("ml-auto text-xs", k.muted)}><TimeAgo iso={l.updatedAt} locale={locale} /></span>
              </div>
              <dl className={cn("mt-3 grid grid-cols-3 gap-2 rounded-xl px-3 py-2.5 text-center", k.soft)}>
                <div className="min-w-0">
                  <dt className={cn(k.label, "text-[10px]")}>{tx(locale, "Calidad", "Quality")}</dt>
                  <dd className="mt-1 flex items-center justify-center gap-1.5">
                    <span className="h-1.5 w-10 rounded-full bg-[#E6DFD3] dark:bg-white/10" aria-hidden><span className={cn("block h-full rounded-full", l.quality >= 85 ? "bg-ok" : l.quality >= 65 ? "bg-warn" : "bg-danger")} style={{ width: `${l.quality}%` }} /></span>
                    <span className="text-xs font-semibold">{l.quality}</span>
                  </dd>
                </div>
                <div>
                  <dt className={cn(k.label, "text-[10px]")}>Leads</dt>
                  <dd className="mt-0.5 font-semibold">{l.stats.leads}</dd>
                </div>
                <div>
                  <dt className={cn(k.label, "text-[10px]")}>{tx(locale, "Días", "Days")}</dt>
                  <dd className="mt-0.5 font-semibold">{l.daysOnMarket}</dd>
                </div>
              </dl>
              <label className="mt-3 flex items-center gap-3 text-sm">
                <span className={cn("shrink-0", k.muted)}>{tx(locale, "Agente", "Agent")}</span>
                {agentSelect(l, tx(locale, `Agente de ${title}`, `Agent for ${title}`), "min-w-0 flex-1", "h-10")}
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {reviewActions(l, title, false)}
                <Link href={edit} className={cn("ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm", k.link)} aria-label={tx(locale, `Editar ${title}`, `Edit ${title}`)}><Pencil size={14} aria-hidden /> {tx(locale, "Editar", "Edit")}</Link>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className={cn(k.card, "px-4 py-10 text-center text-sm", k.muted)}>{tx(locale, "No hay inmuebles con este filtro.", "No listings match this filter.")}</li>}
      </ul>
      <ScrollRegion fade={false} label={tx(locale, "Tabla de inmuebles", "Listings table")} className={cn("hidden md:block", k.card)}>
        {/* Below xl (tablets, 1024 beside the sidebar = 680 px): checkbox · listing (+ price and agent, + meta line) · status ·
            action, so nothing hides under the actions. xl: price and agent get columns (≈ 830 px, fits 936 px at 1280).
            From 2xl every column has its own. */}
        <table className="np-sticky-last w-full text-sm xl:min-w-[800px] 2xl:min-w-[1160px]">
          <thead className={cn("border-b text-left", k.line, k.th)}>
            <tr>
              {selectable && (
                <th className="w-10 py-3 pl-4 pr-0">
                  <SelectAll className={box} checked={allOn} indeterminate={someOn} onChange={toggleAll} disabled={!rows.length} label={tx(locale, `Seleccionar los ${rows.length} visibles`, `Select all ${rows.length} visible`)} />
                </th>
              )}
              <th className="px-4 py-3 font-semibold">{tx(locale, "Inmueble", "Listing")}</th>
              <th className="px-3 py-3 font-semibold">{tx(locale, "Estado", "Status")}</th>
              <th className={cn("px-3 py-3 text-right font-semibold", xlCol)}>{tx(locale, "Precio", "Price")}</th>
              <th className={cn("px-3 py-3 font-semibold", xlCol)}>{tx(locale, "Agente", "Agent")}</th>
              <th className={cn("px-3 py-3 font-semibold", wide)}>{tx(locale, "Calidad", "Quality")}</th>
              <th className={cn("px-3 py-3 text-right font-semibold", wide)}>Leads</th>
              <th className={cn("px-3 py-3 text-right font-semibold", wide)}>{tx(locale, "Días", "Days")}</th>
              <th className={cn("px-3 py-3 font-semibold", wide)}>{tx(locale, "Actualizado", "Updated")}</th>
              <th className="px-3 py-3"><span className="sr-only">{tx(locale, "Acciones", "Actions")}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const a = l.agent;
              const title = tx(locale, l.title_es, l.title_en);
              const action = reviewActions(l, title, true);
              return (
                <tr key={l.id} className={cn("border-t first:border-t-0", k.line, picked.has(l.id) ? "bg-[#F4EFE7] dark:bg-white/[.05]" : k.hover)}>
                  {selectable && (
                    <td className="py-3 pl-4 pr-0">
                      <input type="checkbox" className={box} checked={picked.has(l.id)} onChange={() => toggle(l.id)} aria-label={tx(locale, `Seleccionar ${title}`, `Select ${title}`)} />
                    </td>
                  )}
                  <td className="min-w-[230px] px-4 py-3 2xl:min-w-[300px]">
                    <Link href={`/${locale}/agency/listings/${l.id}/edit`} className="flex items-center gap-3">
                      <PropertyArt scene={l.scenes[0]} seed={l.id} photo={listingPhoto(l, 0)} className="h-12 w-16 shrink-0 rounded-lg" />
                      <div className="min-w-0">
                        <div className="line-clamp-2 font-semibold leading-snug underline-offset-4 hover:underline">{title}</div>
                        <div className={cn("text-xs", k.muted)}>{lbl(TYPE_LABEL[l.listingType], locale)} · {l.zone} · {num(l.areaM2, locale)} m²</div>
                      </div>
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-[76px] xl:hidden" data-testid="listing-price-agent">
                      <span className={cn("whitespace-nowrap text-[15px]", k.num, "tracking-normal")}>{money(l.priceAmount, locale)}<span className={cn("text-xs font-normal", k.muted)}>{priceSuffix(l, locale)}</span></span>
                      {agentSelect(l, tx(locale, `Agente de ${title}`, `Agent for ${title}`), "max-w-[200px]")}
                    </div>
                    <div className={cn("mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-[76px] text-xs 2xl:hidden", k.muted)} data-testid="listing-meta">
                      <span className="inline-flex items-center gap-1.5" title={tx(locale, "Calidad de la ficha", "Listing quality")}>{qualityBar(l, "w-8")}<span className="font-semibold text-navy dark:text-ivory">{l.quality}</span></span>
                      <span>· {l.stats.leads} {l.stats.leads === 1 ? "lead" : "leads"}</span>
                      <span title={tx(locale, "Días en el mercado", "Days on market")}>· {tx(locale, `${l.daysOnMarket} ${l.daysOnMarket === 1 ? "día" : "días"}`, `${l.daysOnMarket} ${l.daysOnMarket === 1 ? "day" : "days"}`)}</span>
                      <span title={tx(locale, "Actualizado", "Updated")}>· <TimeAgo iso={l.updatedAt} locale={locale} /></span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3"><div className="flex flex-col items-start gap-1">{statusPills(l, true)}{l.luxury && <Pill tone="exclusive">{tx(locale, "Exclusiva", "Exclusive")}</Pill>}</div></td>
                  <td className={cn("whitespace-nowrap px-3 text-right", xlCol, k.num, "tracking-normal")}>{money(l.priceAmount, locale)}<span className={cn("text-xs font-normal", k.muted)}>{priceSuffix(l, locale)}</span></td>
                  {/* The select sizes to its longest option, so full agent names always show. */}
                  <td className={cn("px-3", xlCol)}>{agentSelect(l, tx(locale, `Agente de ${title}`, `Agent for ${title}`))}</td>
                  <td className={cn("px-3", wide)}>
                    <div className="flex items-center gap-2">
                      {qualityBar(l, "w-16")}
                      <span className="text-xs font-semibold">{l.quality}</span>
                    </div>
                  </td>
                  <td className={cn("px-3 text-right font-semibold", wide)}>{l.stats.leads}</td>
                  <td className={cn("px-3 text-right", wide)}>{l.daysOnMarket}</td>
                  <td className={cn("px-3 text-xs", wide, k.muted)}><TimeAgo iso={l.updatedAt} locale={locale} /></td>
                  <td className="px-3">{action ?? (a && <span title={a.name}><Initials name={a.name} size={28} /></span>)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={selectable ? 10 : 9} className={cn("px-4 py-10 text-center", k.muted)}>{tx(locale, "No hay inmuebles con este filtro.", "No listings match this filter.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </ScrollRegion>
      <div className={cn("mt-3 flex items-center gap-2 text-xs", k.muted)}><UserPlus size={13} /> {tx(locale, "Backoffice y dueño pueden reasignar agentes. Los agentes solo editan sus inmuebles.", "Backoffice and owner can reassign agents. Agents only edit their own listings.")}</div>

      {bulk && !chosen.length && (
        <div className={cn("mt-4", bulk.failed.length ? k.warnBox : k.okBox)} role="status" aria-live="polite">
          <BulkResult locale={locale} bulk={bulk} onClose={() => setBulk(null)} />
        </div>
      )}
      {chosen.length > 0 && (
        <div className="sticky bottom-3 z-20 mt-4" role="region" aria-label={tx(locale, "Acciones en lote", "Bulk actions")}>
          <div className={cn(k.card, "flex flex-wrap items-center gap-2 p-3 shadow-[0_12px_32px_rgba(28,29,29,.18)] ring-1 ring-[#DED5C7] md:gap-3 md:px-4")}>
            <span className="text-sm font-semibold">{tx(locale, `${chosen.length} ${chosen.length === 1 ? "seleccionado" : "seleccionados"}`, `${chosen.length} selected`)}</span>
            {manager && (
              <Select compact value="" disabled={bulk?.running} onChange={(e) => e.target.value && bulkAssign(e.target.value)} className="h-10" aria-label={tx(locale, "Asignar los seleccionados a…", "Assign selected to…")}>
                <option value="" disabled>{tx(locale, "Asignar a…", "Assign to…")}</option>
                {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
              </Select>
            )}
            {manager && (
              <Button size="sm" variant="navy" className={cn(k.navy, "min-h-10", DISABLED)} disabled={bulk?.running || !approvable.length} onClick={() => runBulk(tx(locale, "Aprobar", "Approve"), approvable, (l) => api(`listings/${l.id}`, { method: "PATCH", json: { review: "APPROVED" } }))} title={tx(locale, "Solo las que están en revisión", "Only those in review")}>
                <CheckCircle2 size={14} /> {tx(locale, `Aprobar (${approvable.length})`, `Approve (${approvable.length})`)}
              </Button>
            )}
            <Button size="sm" variant="outline" className={cn(k.outline, "min-h-10", DISABLED)} disabled={bulk?.running || !pausable.length} onClick={() => runBulk(tx(locale, "Pausar", "Pause"), pausable, (l) => api(`listings/${l.id}`, { method: "PATCH", json: { status: "WITHDRAWN" } }))} title={tx(locale, "Oculta del portal las publicadas; puedes reactivarlas", "Hides published listings; you can reactivate them")}>
              <Pause size={14} /> {tx(locale, `Pausar (${pausable.length})`, `Pause (${pausable.length})`)}
            </Button>
            <Button size="sm" variant="outline" className={cn(k.outline, "min-h-10", DISABLED)} disabled={bulk?.running || !activable.length} onClick={() => runBulk(tx(locale, "Activar", "Activate"), activable, (l) => api(`listings/${l.id}`, { method: "PATCH", json: { status: "ACTIVE" } }))} title={tx(locale, "Vuelve a publicar las pausadas", "Publishes paused listings again")}>
              <Play size={14} /> {tx(locale, `Activar (${activable.length})`, `Activate (${activable.length})`)}
            </Button>
            <Button size="sm" variant="ghost" className={cn(k.ghost, "ml-auto min-h-10")} disabled={bulk?.running} onClick={() => setPicked(new Set())}><X size={14} /> {tx(locale, "Quitar selección", "Clear selection")}</Button>
            {bulk && (
              <div className="w-full text-sm" role="status" aria-live="polite">
                <BulkResult locale={locale} bulk={bulk} onClose={() => setBulk(null)} />
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

/** Header / phone "select all visible" checkbox with the indeterminate state when only some rows are picked. */
/** Disabled bulk actions still say what they are: legible text on the disabled fill (≥ 4.5:1, ≥ 3:1 in dark). */
const DISABLED = "disabled:border-transparent disabled:bg-[#E3DDD3] disabled:text-[#5E5650] dark:disabled:bg-white/10 dark:disabled:text-[#CDC5B9]";

function SelectAll({ checked, indeterminate, onChange, label, className, disabled }: { checked: boolean; indeterminate: boolean; onChange: () => void; label: string; className?: string; disabled?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" className={className} checked={checked} onChange={onChange} disabled={disabled} aria-label={label} />;
}
