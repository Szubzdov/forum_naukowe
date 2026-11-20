import "server-only";
import mammoth from "mammoth";
import { extractTextItems, getDocumentProxy, getMeta } from "unpdf";
import { cleanHtml } from "@/lib/sanitize";

export type ImportResult = {
  /** HTML gotowy do wstawienia w edytorze */
  html: string;
  /** Tytuł znaleziony w pliku (pierwszy nagłówek / metadane PDF), jeśli jest */
  title: string | null;
  /** Informacje dla autora, np. o pominiętych obrazkach */
  notes: string[];
};

export class ImportError extends Error {}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Wspólne porządki: bezpieczny HTML + pierwszy nagłówek H1 jako tytuł dokumentu */
function finish(rawHtml: string, fallbackTitle: string | null, notes: string[]): ImportResult {
  let html = cleanHtml(rawHtml);
  let title: string | null = null;
  const first = /^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (first) {
    title = first[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim() || null;
    if (title) html = html.slice(first[0].length); // tytuł trafia do pola „Tytuł”, nie dubluje się w treści
  }
  html = html.trim();
  if (!html.replace(/<[^>]+>/g, "").trim()) {
    throw new ImportError("Plik nie zawiera tekstu, który można wczytać.");
  }
  return { html, title: title ?? fallbackTitle, notes };
}

/* ======================= Word (.docx) ======================= */

const HEADING_TAGS: Record<string, string> = {
  title: "h1",
  "heading 1": "h1",
  "heading 2": "h2",
  "heading 3": "h3",
  "heading 4": "h3",
  "heading 5": "h3",
  "heading 6": "h3",
  subtitle: "h2",
};

const DOCX_STYLE_MAP = [
  "u => u",
  "strike => s",
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "p[style-name='Heading 4'] => h3:fresh",
  "p[style-name='Heading 5'] => h3:fresh",
  "p[style-name='Heading 6'] => h3:fresh",
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote > p:fresh",
  // akapity wyrównane do środka / do prawej (patrz transformDocument)
  ...["p", "h1", "h2", "h3"].flatMap((tag) =>
    ["center", "right"].map((align) => `p[style-name='fn-${tag}-${align}'] => ${tag}.fn-align-${align}:fresh`),
  ),
];

type DocxParagraph = { styleName?: string | null; styleId?: string | null; alignment?: string; numbering?: unknown };

/** Mammoth gubi wyrównanie — przenosimy je przez nazwę stylu, potem zamieniamy na text-align */
function keepAlignment(paragraph: DocxParagraph): DocxParagraph {
  const align = paragraph.alignment;
  if (paragraph.numbering || (align !== "center" && align !== "right")) return paragraph;
  const tag = HEADING_TAGS[(paragraph.styleName ?? "").toLowerCase()] ?? "p";
  return { ...paragraph, styleId: null, styleName: `fn-${tag}-${align}` };
}

export async function importDocx(buffer: Buffer): Promise<ImportResult> {
  let images = 0;
  const transforms = (mammoth as unknown as { transforms: { paragraph: (f: (p: DocxParagraph) => DocxParagraph) => (e: unknown) => unknown } }).transforms;
  let result;
  try {
    result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: DOCX_STYLE_MAP,
        transformDocument: transforms.paragraph(keepAlignment),
        // obrazki nie są obsługiwane w edytorze — pomijamy je zamiast wczytywać do pamięci
        convertImage: mammoth.images.imgElement(async () => {
          images += 1;
          return { src: "" };
        }),
        ignoreEmptyParagraphs: true,
      },
    );
  } catch {
    throw new ImportError("Nie udało się odczytać pliku Word. Upewnij się, że to plik .docx i że nie jest uszkodzony.");
  }

  const html = result.value
    .replace(/<img[^>]*>/gi, "")
    .replace(/<(p|h1|h2|h3) class="fn-align-(center|right)">/g, '<$1 style="text-align: $2">')
    // tabele z Worda: pierwszy wiersz jako nagłówek zostawiamy, puste akapity wycinamy
    .replace(/<p><\/p>/g, "");

  const notes: string[] = [];
  if (images > 0) {
    notes.push(
      images === 1
        ? "Pominięto 1 obrazek — edytor nie obsługuje obrazków."
        : `Pominięto obrazki (${images}) — edytor nie obsługuje obrazków.`,
    );
  }
  return finish(html, null, notes);
}

/* ======================= PDF ======================= */

type Item = { str: string; x: number; y: number; width: number; fontSize: number; hasEOL: boolean };
type Line = { text: string; x: number; y: number; size: number; right: number };

const BULLET = /^\s*([•●▪■◦○‣∙·\-–—*])\s+/;
const NUMBERED = /^\s*(\d{1,3}|[a-zA-Z])[.)]\s+/;

/** Składa fragmenty tekstu jednej strony w linie (od góry do dołu, od lewej do prawej) */
function toLines(items: Item[]): Line[] {
  const sorted = items.filter((i) => i.str.length > 0).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { items: Item[]; y: number; size: number }[] = [];
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l.y - it.y) < Math.max(2, Math.min(l.size, it.fontSize) * 0.5));
    if (line) {
      line.items.push(it);
      line.size = Math.max(line.size, it.fontSize);
    } else lines.push({ items: [it], y: it.y, size: it.fontSize });
  }
  return lines
    .map((l) => {
      const parts = l.items.sort((a, b) => a.x - b.x);
      let text = "";
      let end = parts[0].x;
      for (const p of parts) {
        const gap = p.x - end;
        if (text && gap > p.fontSize * 0.15 && !text.endsWith(" ") && !p.str.startsWith(" ")) text += " ";
        text += p.str;
        end = p.x + p.width;
      }
      return { text: text.replace(/\s+/g, " ").trim(), x: parts[0].x, y: l.y, size: Math.round(l.size * 10) / 10, right: end };
    })
    .filter((l) => l.text);
}

/** Najczęstszy rozmiar czcionki (ważony liczbą znaków) = zwykły tekst */
function bodySize(lines: Line[]): number {
  const weight = new Map<number, number>();
  for (const l of lines) weight.set(l.size, (weight.get(l.size) ?? 0) + l.text.length);
  return [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Łączy linie w akapit; dzielenie wyrazów „sło-\nwo” scala w „słowo” */
function joinLines(texts: string[]): string {
  return texts.reduce((acc, t) => {
    if (!acc) return t;
    if (/\p{L}-$/u.test(acc) && /^\p{Ll}/u.test(t)) return acc.slice(0, -1) + t;
    return `${acc} ${t}`;
  }, "");
}

export async function importPdf(buffer: Buffer): Promise<ImportResult> {
  let pages: Item[][];
  let metaTitle: string | null = null;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const meta = await getMeta(pdf).catch(() => null);
    const info = meta?.info as { Title?: string } | undefined;
    metaTitle = info?.Title?.trim() || null;
    pages = (await extractTextItems(pdf)).items;
    await (pdf as unknown as { destroy?: () => Promise<void> }).destroy?.();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/password/i.test(msg)) throw new ImportError("Ten PDF jest zabezpieczony hasłem. Usuń hasło i spróbuj ponownie.");
    throw new ImportError("Nie udało się odczytać pliku PDF. Upewnij się, że plik nie jest uszkodzony.");
  }

  const pageLines = pages.map((p) => toLines(p));
  const all = pageLines.flat();
  if (all.length === 0) {
    throw new ImportError(
      "Ten PDF nie zawiera tekstu (to prawdopodobnie skan albo zdjęcia stron). Takiego pliku nie da się wczytać.",
    );
  }

  const body = bodySize(all);
  const gaps: number[] = [];
  for (const lines of pageLines) {
    for (let i = 1; i < lines.length; i++) {
      if (Math.abs(lines[i].size - body) < 0.6) gaps.push(lines[i - 1].y - lines[i].y);
    }
  }
  const lineGap = median(gaps.filter((g) => g > 0)) || body * 1.3;
  const leftEdge = median(all.filter((l) => Math.abs(l.size - body) < 0.6).map((l) => l.x));

  // Nagłówki/stopki powtarzające się na większości stron (tylko krótkie linie przy górnej/dolnej krawędzi)
  // oraz same numery stron — do usunięcia
  const edgeKey = (l: Line) => l.text.replace(/\d+/g, "#");
  // linia przy krawędzi strony, oddzielona od treści większym odstępem albo pisana mniejszą czcionką
  const edges = (lines: Line[]) =>
    lines.filter((l, i) => {
      if (l.text.length > 100 || (i > 1 && i < lines.length - 2)) return false;
      const neighbour = i < 2 ? lines[i + 1] : lines[i - 1];
      const separated = !neighbour || Math.abs(neighbour.y - l.y) > lineGap * 1.45;
      return separated || l.size < body - 0.5;
    });
  const edgeCount = new Map<string, number>();
  for (const lines of pageLines) {
    for (const key of new Set(edges(lines).map(edgeKey))) edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
  }
  const dropped = new Set<Line>();
  for (const lines of pageLines) {
    for (const l of edges(lines)) {
      const isPageNumber = /^(\d{1,4}|[-–]\s*\d{1,4}\s*[-–]|(strona|str\.|page)\s*\d+(\s*(z|of|\/)\s*\d+)?)$/i.test(l.text);
      const repeated = pageLines.length >= 2 && (edgeCount.get(edgeKey(l)) ?? 0) >= Math.max(2, pageLines.length * 0.6);
      if (isPageNumber || repeated) dropped.add(l);
    }
  }


  const blocks: string[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[][] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push(`<p>${escapeHtml(joinLines(para))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) {
      const tag = list.ordered ? "ol" : "ul";
      blocks.push(`<${tag}>${list.items.map((it) => `<li><p>${escapeHtml(joinLines(it))}</p></li>`).join("")}</${tag}>`);
    }
    list = null;
  };

  let prev: Line | null = null;
  for (const lines of pageLines) {
    let pageStart = true;
    for (const line of lines) {
      if (dropped.has(line)) continue;

      const ratio = line.size / body;
      const isHeading = ratio >= 1.15 && line.text.length <= 140;
      const gap = prev ? prev.y - line.y : 0;
      // na nowej stronie odległość od poprzedniej linii nic nie znaczy
      const newBlock =
        !prev || (!pageStart && gap > lineGap * 1.45) || Math.abs(line.size - prev.size) > 0.6;
      pageStart = false;

      if (isHeading) {
        flushPara();
        flushList();
        const tag = ratio >= 1.6 && blocks.length === 0 ? "h1" : ratio >= 1.35 ? "h2" : "h3";
        // nagłówek na dwie linie — dopisz do poprzedniego
        const last = blocks[blocks.length - 1];
        if (!newBlock && last?.startsWith(`<${tag}>`)) {
          blocks[blocks.length - 1] = last.replace(`</${tag}>`, ` ${escapeHtml(line.text)}</${tag}>`);
        } else blocks.push(`<${tag}>${escapeHtml(line.text)}</${tag}>`);
        prev = line;
        continue;
      }

      const bullet = BULLET.exec(line.text);
      const number = bullet ? null : NUMBERED.exec(line.text);
      if (bullet || number) {
        flushPara();
        const ordered = !!number;
        if (list && list.ordered !== ordered) flushList();
        list ??= { ordered, items: [] };
        list.items.push([line.text.slice((bullet ?? number)![0].length)]);
      } else if (
        list &&
        !newBlock &&
        (line.x > leftEdge + body * 0.8 || !/[.!?:;]$/.test(list.items[list.items.length - 1].at(-1) ?? ""))
      ) {
        // dalszy ciąg punktu listy (wcięta linia albo punkt urwany w pół zdania)
        list.items[list.items.length - 1].push(line.text);
      } else {
        flushList();
        if (newBlock) flushPara();
        para.push(line.text);
      }
      prev = line;
    }
    // akapit może przechodzić na następną stronę — nie zamykamy go, jeśli strona kończy się w pół zdania
    if (para.length && /[.!?:;”"»)]$/.test(para[para.length - 1])) flushPara();
  }
  flushPara();
  flushList();

  const notes = ["Wczytano tekst z PDF. Sprawdź nagłówki i formatowanie — PDF nie zapisuje pogrubień ani tabel."];
  return finish(blocks.join(""), metaTitle, notes);
}
