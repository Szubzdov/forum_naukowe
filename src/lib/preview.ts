/** Około 6 linijek tekstu na stronie A4 — tyle tekstu widzi niezalogowany czytelnik */
export const PREVIEW_CHARS = 520;

/** Pierwsze akapity tekstu przycięte do PREVIEW_CHARS (podgląd wpisu i miniatura na kafelku) */
export function buildPreview(text: string): string[] {
  const out: string[] = [];
  let used = 0;
  for (const raw of text.split("\n")) {
    const para = raw.trim();
    if (!para) continue;
    const room = PREVIEW_CHARS - used;
    if (room <= 40) break;
    if (para.length <= room) {
      out.push(para);
      used += para.length + 60; // akapit zajmuje też resztę ostatniej linijki
    } else {
      const cut = para.slice(0, room);
      out.push(cut.slice(0, cut.lastIndexOf(" ")) + "…");
      break;
    }
  }
  return out;
}
