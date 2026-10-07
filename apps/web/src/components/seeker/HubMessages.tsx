"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageSquare, Send } from "lucide-react";
import type { Listing, Locale, Message } from "@/types/domain";
import { Avatar, Badge, Button, Card, inputCls } from "@/components/ui";
import { Empty, k } from "@/components/agency/kit";
import { api } from "@/lib/api";
import { ago, dateTime, tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export type HubThread = {
  id: string;
  subject: string | null;
  listingId: string | null;
  leadId: string | null;
  participants: { id: string; name: string; hue: number }[];
  messages: Message[];
  unread: number;
};

const initialsOf = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";

type ListingTitle = Pick<Listing, "id" | "title_es" | "title_en">;

/**
 * Inbox: every thread with last message + unread badge; opening one shows the full conversation and a reply box.
 * Seeker Hub: all threads. Agency (`direct`): only conversations not tied to a lead (leads are answered from the
 * leads inbox, which also runs their SLA), e.g. a buyer's "Contactar" chat from a listing.
 * `?thread=<id>` in the URL opens that thread on arrival.
 */
export function HubMessages({
  locale,
  threads,
  meId,
  listingById,
  listings,
  direct = false,
  className,
}: {
  locale: Locale;
  threads: HubThread[];
  meId: string;
  listingById?: (id: string) => ListingTitle | undefined;
  listings?: ListingTitle[];
  direct?: boolean;
  className?: string;
}) {
  const qc = useQueryClient();
  const live = useQuery({ queryKey: ["hub-threads"], queryFn: () => api<{ threads: HubThread[] }>("threads"), initialData: { threads }, refetchInterval: 15_000 });
  const list = direct ? live.data.threads.filter((t) => !t.leadId) : live.data.threads;
  const findListing = (id: string) => listingById?.(id) ?? listings?.find((l) => l.id === id);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  // Deep link from a listing's "Contactar": open the thread and, when it is still empty, suggest a first line.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("thread");
    if (!id) return;
    const t = threads.find((x) => x.id === id);
    if (!t) return;
    setOpenId(t.id);
    if (!t.messages.length) {
      const l = t.listingId ? listingById?.(t.listingId) ?? listings?.find((x) => x.id === t.listingId) : undefined;
      const name = l ? tx(locale, l.title_es, l.title_en) : t.subject;
      setDraft(name ? tx(locale, `Hola, me interesa «${name}». ¿Podemos hablar?`, `Hi, I’m interested in “${name}”. Can we talk?`) : "");
    }
    rootRef.current?.scrollIntoView({ block: "start" });
    // Run once on arrival; later polling must not reopen a thread the user closed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const open = list.find((t) => t.id === openId) ?? null;

  const title = (t: HubThread) => {
    const l = t.listingId ? findListing(t.listingId) : undefined;
    if (l) return tx(locale, l.title_es, l.title_en);
    if (t.subject) return t.subject;
    return t.participants.filter((p) => p.id !== meId).map((p) => p.name).join(", ") || tx(locale, "Conversación", "Conversation");
  };
  const counterpart = (t: HubThread) => t.participants.find((p) => p.id !== meId);

  const setThreads = (fn: (ts: HubThread[]) => HubThread[]) => qc.setQueryData<{ threads: HubThread[] }>(["hub-threads"], (d) => ({ threads: fn(d?.threads ?? list) }));

  const openThread = (t: HubThread) => {
    setOpenId(t.id);
    setErr(null);
    setDraft("");
  };

  // New replies arriving (15 s polling) while the thread is open count as read.
  const openUnread = open?.unread ?? 0;
  useEffect(() => {
    if (!openId || openUnread === 0) return;
    qc.setQueryData<{ threads: HubThread[] }>(["hub-threads"], (d) => (d ? { threads: d.threads.map((x) => (x.id === openId ? { ...x, unread: 0 } : x)) } : d));
    api(`threads/${openId}/read`, { method: "POST" }).catch(() => undefined);
  }, [openId, openUnread, qc]);

  useEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, open?.messages.length]);

  const send = async () => {
    if (!open) return;
    const text = draft.trim();
    if (!text) {
      setErr(tx(locale, "Escribe un mensaje.", "Write a message."));
      return;
    }
    setSending(true);
    setErr(null);
    try {
      const m = await api<Message>(`threads/${open.id}/messages`, { method: "POST", json: { body: text } });
      setThreads((ts) => [{ ...open, messages: [...open.messages, m], unread: 0 }, ...ts.filter((x) => x.id !== open.id)]);
      setDraft("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const totalUnread = list.reduce((n, t) => n + t.unread, 0);

  return (
    <div ref={rootRef} id="mensajes" className={cn("scroll-mt-24 lg:col-span-2", className)}>
    <Card className={cn(k.card, "border-0 p-5")}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-serif text-[24px] font-medium leading-tight">
          <MessageSquare size={18} strokeWidth={1.6} className="text-navy/70 dark:text-ivory/70" /> {direct ? tx(locale, "Mensajes directos", "Direct messages") : tx(locale, "Mensajes", "Messages")}
          {totalUnread > 0 && <Badge className="bg-[#E6EBF1] text-navy dark:bg-white/10">{totalUnread} {tx(locale, totalUnread === 1 ? "nuevo" : "nuevos", "new")}</Badge>}
        </h2>
        {open && (
          <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>
            <ArrowLeft size={14} /> {tx(locale, "Todas", "All")}
          </Button>
        )}
      </div>

      {!open && list.length === 0 && (
        <div className="mt-4">
          <Empty className="py-6" title={tx(locale, "Aún no tienes mensajes", "No messages yet")} body={direct ? tx(locale, "Cuando un cliente pulse «Contactar» en una de tus fichas, la conversación aparecerá aquí.", "When a client taps “Contact” on one of your listings, the conversation shows up here.") : tx(locale, "Escribe al agente desde cualquier ficha y la conversación aparecerá aquí.", "Write to the agent from any listing and the conversation will show up here.")} />
        </div>
      )}

      {!open && list.length > 0 && (
        <ul className="mt-3 divide-y divide-line" aria-label={tx(locale, "Conversaciones", "Conversations")}>
          {list.map((t) => {
            const last = t.messages[t.messages.length - 1];
            const who = counterpart(t);
            return (
              <li key={t.id}>
                <button onClick={() => openThread(t)} className="flex w-full min-w-0 items-start gap-3 py-3 text-left hover:bg-black/[0.02]" aria-label={`${title(t)}${t.unread ? ` · ${t.unread} ${tx(locale, "sin leer", "unread")}` : ""}`}>
                  <Avatar initials={initialsOf(who?.name ?? "?")} hue={who?.hue ?? 200} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("line-clamp-1 text-sm", t.unread ? "font-bold" : "font-semibold")}>{title(t)}</span>
                      {last && <span className="shrink-0 text-xs text-muted">{ago(last.at, locale)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 text-sm text-muted">
                        {last ? `${last.mine ? tx(locale, "Tú: ", "You: ") : ""}${last.body}` : tx(locale, "Sin mensajes todavía", "No messages yet")}
                      </span>
                      {t.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-navy px-1.5 text-[11px] font-bold text-ivory">{t.unread}</span>}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="mt-3">
          <div className="font-semibold">{title(open)}</div>
          <div className="text-xs text-muted">{open.participants.filter((p) => p.id !== meId).map((p) => p.name).join(", ")}</div>
          <div ref={logRef} role="log" aria-live="polite" aria-label={tx(locale, "Conversación", "Conversation")} className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-np bg-ivory p-3 scrollbar-thin">
            {open.messages.length === 0 && <p className="text-sm text-muted">{tx(locale, "Aún no hay mensajes en esta conversación.", "No messages in this conversation yet.")}</p>}
            {open.messages.map((m) => (
              <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] break-words rounded-2xl px-3 py-2 text-sm", m.mine ? "bg-navy text-ivory" : "border border-line bg-white")}>
                  {!m.mine && <div className="text-xs font-semibold text-ink/70">{m.from}</div>}
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  <div className={cn("mt-0.5 text-[11px]", m.mine ? "text-ivory/70" : "text-muted")}>{dateTime(m.at, locale)}</div>
                </div>
              </div>
            ))}
          </div>
          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              rows={2}
              aria-label={tx(locale, "Tu respuesta", "Your reply")}
              placeholder={tx(locale, "Escribe tu respuesta…", "Write your reply…")}
              className={cn(inputCls, "h-auto min-w-0 flex-1 py-2")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button type="submit" variant="navy" disabled={sending} aria-label={tx(locale, "Enviar respuesta", "Send reply")} className="h-11 shrink-0">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span className="hidden sm:inline">{tx(locale, "Enviar", "Send")}</span>
            </Button>
          </form>
          {err && <div role="alert" className="mt-2 rounded-xl border border-danger/25 bg-[#B3261E0D] px-3.5 py-2.5 text-sm text-danger">{err}</div>}
        </div>
      )}
    </Card>
    </div>
  );
}
