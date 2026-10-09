"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { MapPin } from "lucide-react";
import { ZONE_DIRECTORY, suggestPlaces, type PlaceSuggestion, type ZoneEntry } from "@newplace/ai";
import type { Locale } from "@/types/domain";
import { tx } from "@/lib/i18n";
import { cn } from "@/lib/cn";

/** Zone groups from the search page → a flat place list (cities first, then their zones). */
export function placesFromGroups(groups: { city: string; zones: string[] }[]): ZoneEntry[] {
  return [...groups.map((g) => ({ name: g.city })), ...groups.flatMap((g) => g.zones.map((z) => ({ name: z, city: g.city })))];
}

/** Replaces the typed fragment at the end of the text with the place's full name. */
function complete(text: string, s: PlaceSuggestion): string {
  const head = text.replace(/\s+$/, "");
  return `${head.slice(0, head.length - s.replace.length)}${s.name} `;
}

/**
 * Place typeahead for a search text field (ARIA 1.2 combobox with a listbox popup): as people type, the zones and
 * cities that start with the last word(s) appear below the field ("Lech" → Lechería). ↑/↓ move, Enter or a click
 * picks AND searches (`onPick` runs the search with the completed text — picking a place is the search), Tab only
 * completes the text, Escape closes; with nothing highlighted, Enter submits the form as usual. Spread `inputProps` on the <input> and
 * render `listbox` inside a `relative` wrapper around it.
 */
export function usePlaceSuggest({
  locale,
  text,
  setText,
  places = ZONE_DIRECTORY,
  onPick,
  className,
}: {
  locale: Locale;
  text: string;
  setText: (v: string) => void;
  places?: ZoneEntry[];
  /** Called when a suggestion is picked with Enter or a click: run the search with `next` straight away (state set
   * by `setText` isn't readable yet in the same tick, so use `next`, not the field's state). Not called on Tab. */
  onPick?: (next: string, s: PlaceSuggestion) => void;
  className?: string;
}) {
  const id = useId();
  const listId = `${id}-places`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const items = useMemo(() => suggestPlaces(text, places, 6), [text, places]);
  const shown = open && items.length > 0;
  const optId = (i: number) => `${id}-opt-${i}`;

  const pick = (s: PlaceSuggestion, search = true) => {
    const next = complete(text, s);
    setText(next);
    setOpen(false);
    setActive(-1);
    if (search) onPick?.(next, s);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (!items.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      if (!items.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && shown && active >= 0 && items[active]) {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === "Escape" && shown) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Tab" && shown && active >= 0 && items[active]) {
      // Tab accepts the highlighted place (like most address fields) without trapping focus or searching yet.
      pick(items[active], false);
    }
  };

  const inputProps = {
    role: "combobox" as const,
    "aria-autocomplete": "list" as const,
    "aria-expanded": shown,
    "aria-controls": listId,
    "aria-activedescendant": shown && active >= 0 ? optId(active) : undefined,
    autoComplete: "off",
    onKeyDown,
    onFocus: () => setOpen(true),
    onBlur: () => {
      setOpen(false);
      setActive(-1);
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setText(e.target.value);
      setOpen(true);
      setActive(-1);
    },
  };

  const listbox = (
    <ul
      id={listId}
      role="listbox"
      aria-label={tx(locale, "Zonas sugeridas", "Suggested areas")}
      hidden={!shown}
      className={cn(
        "absolute bg-[#FBF8F4] inset-x-0 top-[calc(100%+6px)] z-50 max-h-[min(320px,50vh)] overflow-y-auto rounded-2xl p-1.5 text-left text-ink shadow-np [--np-glass:rgb(255_255_255/.94)] [html.dark_&]:!bg-[#2A2420]",
        className,
      )}
    >
      {items.map((s, i) => (
        <li
          key={s.name}
          id={optId(i)}
          role="option"
          aria-selected={i === active}
          // mousedown, not click: the input keeps focus (no blur closes the list first).
          onMouseDown={(e) => {
            e.preventDefault();
            pick(s);
          }}
          onMouseEnter={() => setActive(i)}
          className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-3 font-display text-[15px]", i === active ? "bg-ink/[.07]" : "")}
        >
          <MapPin size={16} aria-hidden className="shrink-0 text-[#8E3B22]" />
          <span className="min-w-0 truncate">
            <span className="font-semibold">{s.name}</span>
            {s.city && <span className="text-ink/60">, {s.city}</span>}
          </span>
          <span className="ml-auto shrink-0 text-[12px] text-ink/50">{s.city ? tx(locale, "Zona", "Area") : tx(locale, "Ciudad", "City")}</span>
        </li>
      ))}
    </ul>
  );

  return { inputProps, listbox, open: shown };
}
