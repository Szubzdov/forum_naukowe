export type TextType = {
  value: string;
  label: string;
  minWords: number;
};

export const TEXT_TYPES: TextType[] = [
  { value: "wpis", label: "Wpis", minWords: 150 },
  { value: "artykul", label: "Artykuł", minWords: 500 },
  { value: "rozprawka", label: "Rozprawka", minWords: 400 },
  { value: "esej", label: "Esej", minWords: 400 },
  { value: "notatka", label: "Notatka", minWords: 150 },
  { value: "recenzja", label: "Recenzja", minWords: 300 },
];

export function getTextType(value: string | null | undefined): TextType {
  return TEXT_TYPES.find((t) => t.value === value) ?? TEXT_TYPES[0];
}

/** Ile aktywnych odrzuceń powoduje blokadę publikowania */
export const REJECTION_LIMIT = 5;
/** Po ilu dniach pojedyncze odrzucenie wygasa */
export const REJECTION_TTL_DAYS = 7;
/** Na ile dni blokowane jest publikowanie */
export const PUBLISH_BLOCK_DAYS = 7;

export const DAY_MS = 24 * 60 * 60 * 1000;

export function countWords(text: string): number {
  const words = text.trim().match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu);
  return words ? words.length : 0;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Zamienia HTML na czysty tekst z zachowaniem podziału na akapity (znak nowej linii) */
export function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|h[1-6]|li|blockquote|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}
