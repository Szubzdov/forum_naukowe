/**
 * Zamiana HTML dokumentu na czytelny zwykły tekst (.txt) z zachowaniem układu:
 * nagłówki podkreślone, listy z punktami/numerami, akapity oddzielone pustą linią,
 * tabele z kolumnami rozdzielonymi tabulatorem, indeksy dolne/górne jako znaki Unicode (CO₂, m²).
 */

const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
};
const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

export function htmlToPlainText(html: string): string {
  let out = "";
  const lists: { ordered: boolean; n: number }[] = [];
  let quote = 0;
  let sub = 0;
  let sup = 0;
  let firstCell = true;
  let cell = 0; // wewnątrz komórki tabeli akapity nie łamią wiersza
  let afterBullet = false; // tuż po „• ” / „1. ” — akapit w punkcie listy nie łamie linii

  const atLineStart = () => out === "" || out.endsWith("\n");
  const breakLines = (n: number) => {
    if (out === "") return;
    const trailing = out.length - out.replace(/\n+$/, "").length;
    out = out.replace(/[ \t]+$/, "") + "\n".repeat(Math.max(0, n - trailing));
  };
  const write = (text: string) => {
    if (atLineStart() && !afterBullet) {
      text = text.replace(/^ +/, "");
      if (!text) return;
      if (quote) out += "> ".repeat(quote);
    }
    out += text;
    afterBullet = false;
  };
  const lastLineLength = () => out.slice(out.lastIndexOf("\n") + 1).length;

  const re = /<(\/?)([a-z0-9]+)[^>]*?(\/?)>|([^<]+)/gi;
  for (const m of html.matchAll(re)) {
    const [, closing, rawTag, , text] = m;
    if (text !== undefined) {
      let t = decodeEntities(text).replace(/\s+/g, " ");
      if (sub) t = [...t].map((c) => SUB[c] ?? c).join("");
      else if (sup) t = [...t].map((c) => SUP[c] ?? c).join("");
      write(t);
      continue;
    }
    const tag = rawTag.toLowerCase();
    const isClose = closing === "/";
    switch (tag) {
      case "p":
      case "blockquote":
        if (tag === "blockquote") quote += isClose ? -1 : 1;
        if (cell > 0 || (!isClose && afterBullet)) break;
        breakLines(lists.length ? 1 : 2);
        break;
      case "h1":
      case "h2":
      case "h3":
      case "h4":
        if (isClose) {
          const len = lastLineLength();
          if (tag === "h1" || tag === "h2") out += "\n" + (tag === "h1" ? "=" : "-").repeat(len);
        }
        breakLines(2);
        break;
      case "ul":
      case "ol":
        if (isClose) lists.pop();
        else lists.push({ ordered: tag === "ol", n: Number(/start="(\d+)"/.exec(m[0])?.[1] ?? 1) - 1 });
        breakLines(lists.length ? 1 : 2);
        break;
      case "li":
        breakLines(1);
        if (!isClose && lists.length) {
          const list = lists[lists.length - 1];
          list.n += 1;
          out += "   ".repeat(lists.length - 1) + (list.ordered ? `${list.n}. ` : "• ");
          afterBullet = true;
        }
        break;
      case "br":
        out += "\n";
        break;
      case "hr":
        breakLines(2);
        out += "* * *";
        breakLines(2);
        break;
      case "table":
        breakLines(2);
        break;
      case "tr":
        breakLines(1);
        firstCell = true;
        break;
      case "td":
      case "th":
        if (!isClose) {
          if (!firstCell) out += "\t";
          firstCell = false;
          cell += 1;
        } else cell = Math.max(0, cell - 1);
        break;
      case "sub":
        sub += isClose ? -1 : 1;
        break;
      case "sup":
        sup += isClose ? -1 : 1;
        break;
    }
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
