"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";

/** "Son las 23:40 y alguien te contesta." with the real time in Venezuela (UTC-4); the server render has no hour. */
export function GuardiaClock({ locale }: { locale: Locale }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      const d = new Date();
      const h = (d.getUTCHours() + 20) % 24;
      setNow(`${String(h).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`);
    };
    read();
    const iv = window.setInterval(read, 30_000);
    return () => clearInterval(iv);
  }, []);
  if (!now) return <>{tx(locale, "A cualquier hora, alguien te contesta.", "At any hour, someone answers.")}</>;
  return (
    <>
      {tx(locale, "Son las ", "It's ")}
      <span className="tabular-nums">{now}</span>
      {tx(locale, " y alguien te contesta.", " and someone answers.")}
    </>
  );
}
