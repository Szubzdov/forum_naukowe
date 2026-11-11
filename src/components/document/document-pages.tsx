"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CONTENT_H, PAD_X, PAGE_W, PageFrame } from "./page-frame";
import { ScaleToFit } from "./scale-to-fit";

const CONTENT_W = PAGE_W - 2 * PAD_X;

/**
 * Dzieli HTML dokumentu na strony A4: mierzy każdy blok (akapit, nagłówek, tabelę…)
 * w ukrytym kontenerze i układa je kolejno na stronach. Listy dzielone są po punktach.
 */
function paginate(container: HTMLElement): string[] {
  const pages: string[][] = [[]];
  let used = 0;

  const fits = (h: number) => used === 0 || used + h <= CONTENT_H;
  const place = (html: string, h: number) => {
    if (!fits(h)) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(html);
    used += h;
  };

  const blocks = Array.from(container.children) as HTMLElement[];
  blocks.forEach((el, i) => {
    const next = blocks[i + 1];
    // wysokość bloku razem z odstępem do następnego
    const h = next ? next.offsetTop - el.offsetTop : el.offsetHeight;

    const isList = el.tagName === "UL" || el.tagName === "OL";
    if (isList && !fits(h) && el.children.length > 1) {
      const items = Array.from(el.children) as HTMLElement[];
      const start = Number(el.getAttribute("start") ?? 1);
      let chunk: string[] = [];
      let chunkH = 0;
      let chunkStart = start;
      const flush = () => {
        if (!chunk.length) return;
        const startAttr = el.tagName === "OL" ? ` start="${chunkStart}"` : "";
        place(`<${el.tagName.toLowerCase()}${startAttr}>${chunk.join("")}</${el.tagName.toLowerCase()}>`, chunkH);
      };
      items.forEach((li, j) => {
        const liNext = items[j + 1];
        const liH = liNext ? liNext.offsetTop - li.offsetTop : li.offsetHeight + 12;
        if (used + chunkH + liH > CONTENT_H && (chunk.length || used > 0)) {
          flush();
          pages.push([]);
          used = 0;
          chunkStart = start + j;
          chunk = [];
          chunkH = 0;
        }
        chunk.push(li.outerHTML);
        chunkH += liH;
      });
      flush();
      return;
    }
    place(el.outerHTML, h);
  });

  return pages.map((p) => p.join(""));
}

export function DocumentPages({ title, html, author }: { title: string; html: string; author: string }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[] | null>(null);
  const fullHtml = `<h1 class="doc-title">${escapeHtml(title)}</h1>${html}`;

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const run = () => setPages(paginate(el));
    // poczekaj na fonty, żeby pomiar był dokładny
    if (document.fonts?.status === "loaded") run();
    else document.fonts.ready.then(run);
  }, [fullHtml]);

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden
        className="doc-content pointer-events-none invisible absolute left-[-9999px] top-0"
        style={{ width: CONTENT_W }}
        dangerouslySetInnerHTML={{ __html: fullHtml }}
      />
      <ScaleToFit>
        <div className="flex flex-col items-center gap-8">
          {(pages ?? [fullHtml]).map((pageHtml, i, all) => (
            <PageFrame key={i} author={author} pageNumber={i + 1} pageCount={pages ? all.length : 0}>
              <div className="doc-content" dangerouslySetInnerHTML={{ __html: pageHtml }} />
            </PageFrame>
          ))}
        </div>
      </ScaleToFit>
    </>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
