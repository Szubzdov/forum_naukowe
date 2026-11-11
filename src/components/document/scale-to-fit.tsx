"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PAGE_W } from "./page-frame";

/** Zmniejsza strony A4 tak, żeby mieściły się na wąskich ekranach (telefony, tablety). */
export function ScaleToFit({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / PAGE_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full">
      <div className="mx-auto" style={{ width: PAGE_W, zoom: scale }}>
        {children}
      </div>
    </div>
  );
}
