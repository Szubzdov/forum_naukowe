import type { ReactNode } from "react";

/** Wymiary strony A4 w pikselach (96 dpi) */
export const PAGE_W = 794;
export const PAGE_H = 1123;
export const PAD_X = 76; // ~20 mm
export const PAD_TOP = 84;
export const PAD_BOTTOM = 96;
export const CONTENT_H = PAGE_H - PAD_TOP - PAD_BOTTOM;

function Watermark({ author }: { author: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
      <div className="absolute left-1/2 top-1/2 flex w-[180%] -translate-x-1/2 -translate-y-1/2 -rotate-[32deg] flex-wrap justify-center gap-x-24 gap-y-28">
        {Array.from({ length: 36 }, (_, i) => (
          <span
            key={i}
            className="whitespace-nowrap font-sans text-[26px] font-semibold uppercase tracking-[0.2em] text-[#263a94] opacity-[0.055]"
          >
            {author}
          </span>
        ))}
      </div>
    </div>
  );
}

export function PageFrame({
  author,
  pageNumber,
  pageCount,
  children,
}: {
  author: string;
  pageNumber: number;
  pageCount: number;
  children: ReactNode;
}) {
  return (
    <div
      className="relative bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_24px_48px_-24px_rgba(0,0,0,0.28)]"
      style={{ width: PAGE_W, minHeight: PAGE_H }}
    >
      <Watermark author={author} />
      <div className="relative" style={{ padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px` }}>
        {children}
      </div>
      {/* Stopka: numer strony po lewej, autor w prawym dolnym rogu */}
      <div className="pointer-events-none absolute bottom-[22px] left-[30px] font-sans text-[10.5px] text-[#8a8f9c]">
        {pageCount > 0 ? `${pageNumber} / ${pageCount}` : null}
      </div>
      <div className="absolute bottom-[22px] right-[30px] font-sans text-[10.5px] font-medium text-[#5d6270]">
        {author}
      </div>
    </div>
  );
}
