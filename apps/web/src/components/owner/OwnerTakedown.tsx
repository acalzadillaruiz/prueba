"use client";

import { useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import type { Locale } from "@/types/domain";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";
import { tx } from "@/lib/i18n";
import { TimeAgo } from "./TimeAgo";

/** A listing retired by moderation: why, and a way to ask for a new review (POST /listings/:id/appeal). */
export function OwnerTakedown({ locale, listingId, reason, appealedAt, onAppealed }: { locale: Locale; listingId: string; reason: string; appealedAt: string | null; onAppealed: () => void }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(appealedAt);
  const short = msg.trim().length < 10;

  return (
    <div className="mt-3 rounded-lg border border-danger/25 bg-[#B3261E0D] px-3.5 py-3 text-sm" data-testid="owner-takedown">
      <div className="flex items-start gap-2">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />
        <div className="min-w-0">
          <div className="font-semibold text-danger">{tx(locale, "Nuestro equipo de moderación retiró este anuncio", "Our moderation team took this listing down")}</div>
          <div className="mt-0.5 text-ink/80">
            {tx(locale, "Motivo:", "Reason:")} <span className="font-semibold">{reason}</span>
          </div>
          <div className="mt-1 text-xs text-muted">{tx(locale, "Mientras esté retirado no aparece en el buscador. Si crees que es un error, cuéntanos por qué.", "While it’s down it doesn’t show in search. If you think it’s a mistake, tell us why.")}</div>
        </div>
      </div>
      {sentAt ? (
        <div className="mt-2.5 rounded-lg bg-white px-3 py-2 text-xs dark:bg-white/[.05]" role="status">
          {tx(locale, "Recibimos tu apelación", "We got your appeal")} (<TimeAgo iso={sentAt} locale={locale} />). {tx(locale, "Te escribimos por correo cuando la revisemos.", "We’ll email you once we’ve reviewed it.")}
        </div>
      ) : open ? (
        <form
          className="mt-2.5 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (short) {
              setErr(tx(locale, "Cuéntanos un poco más (mínimo 10 caracteres).", "Tell us a little more (10 characters at least)."));
              return;
            }
            setBusy(true);
            setErr(null);
            try {
              const r = await api<{ createdAt: string }>(`listings/${listingId}/appeal`, { method: "POST", json: { message: msg.trim() } });
              setSentAt(r.createdAt);
              onAppealed();
            } catch (x) {
              setErr((x as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            maxLength={1000}
            className="h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none"
            placeholder={tx(locale, "Por ejemplo: las fotos son de mi casa y puedo mostrar el documento de propiedad.", "For example: the photos are of my home and I can show the title deed.")}
            aria-label={tx(locale, "¿Por qué debería volver a publicarse?", "Why should it go back online?")}
          />
          {err && <p role="alert" className="text-xs font-semibold text-danger">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="navy" type="submit" disabled={busy}>{busy && <Loader2 size={13} className="animate-spin" />} {tx(locale, "Enviar apelación", "Send appeal")}</Button>
            <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>{tx(locale, "Cancelar", "Cancel")}</Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="outline" className="mt-2.5" onClick={() => setOpen(true)}>{tx(locale, "Apelar", "Appeal")}</Button>
      )}
    </div>
  );
}
