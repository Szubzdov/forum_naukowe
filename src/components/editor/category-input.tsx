"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { MAX_CATEGORIES } from "@/lib/constants";

/**
 * Pole kategorii jak tagi: wpisz nazwę i naciśnij Enter (albo przecinek), żeby dodać.
 * Backspace w pustym polu usuwa ostatnią kategorię.
 */
export function CategoryInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
}) {
  const [draft, setDraft] = useState("");
  const full = value.length >= MAX_CATEGORIES;

  const add = (raw: string) => {
    const name = raw.trim().replace(/\s+/g, " ").slice(0, 60);
    setDraft("");
    if (!name || full || value.some((v) => v.toLowerCase() === name.toLowerCase())) return;
    // jeśli taka kategoria już istnieje, użyj jej pisowni
    const known = suggestions.find((s) => s.toLowerCase() === name.toLowerCase());
    onChange([...value, known ?? name]);
  };

  const remove = (name: string) => onChange(value.filter((v) => v !== name));

  return (
    <div>
      <div className="mt-1.5 flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
        {value.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 rounded-md bg-brand-50 py-0.5 pl-2 pr-1 text-[13px] font-medium text-brand-700"
          >
            {c}
            <button
              type="button"
              onClick={() => remove(c)}
              className="rounded p-0.5 hover:bg-brand-100"
              aria-label={`Usuń kategorię ${c}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!full && (
          <input
            value={draft}
            onChange={(e) => {
              const v = e.target.value;
              // przecinek albo średnik kończy kategorię
              if (/[,;]/.test(v)) {
                v.split(/[,;]/).slice(0, -1).forEach(add);
                setDraft(v.split(/[,;]/).pop() ?? "");
              } else setDraft(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
              } else if (e.key === "Backspace" && !draft && value.length) {
                remove(value[value.length - 1]);
              }
            }}
            onBlur={() => draft.trim() && add(draft)}
            list="category-list"
            maxLength={60}
            placeholder={value.length ? "Dodaj kolejną…" : "Np. Biologia, Chemia"}
            className="h-7 min-w-[8rem] flex-1 bg-transparent px-1 text-sm font-normal outline-none"
          />
        )}
      </div>
      <datalist id="category-list">
        {suggestions
          .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
          .map((c) => (
            <option key={c} value={c} />
          ))}
      </datalist>
      <span className="mt-1 block text-xs font-normal text-muted">
        {full
          ? `Maksymalnie ${MAX_CATEGORIES} kategorii.`
          : `Enter lub przecinek dodaje kategorię (do ${MAX_CATEGORIES}).`}
      </span>
    </div>
  );
}
