import { getTextType } from "@/lib/constants";

const STYLES: Record<string, string> = {
  wpis: "bg-sky-50 text-sky-800 ring-sky-200",
  artykul: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  rozprawka: "bg-amber-50 text-amber-800 ring-amber-200",
  esej: "bg-rose-50 text-rose-800 ring-rose-200",
  notatka: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  recenzja: "bg-violet-50 text-violet-800 ring-violet-200",
};

export function TypeBadge({ type }: { type: string | null }) {
  const t = getTextType(type);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[t.value] ?? STYLES.wpis}`}
    >
      {t.label}
    </span>
  );
}
