"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FolderOpen, LogOut, PenLine } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { initials } from "@/lib/constants";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-700 ring-offset-2 hover:ring-2 hover:ring-brand-100 transition"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu konta"
      >
        {initials(name)}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-white shadow-lg shadow-black/5"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
          <div className="p-1 text-sm">
            <Link href="/moj-folder" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-paper">
              <FolderOpen className="h-4 w-4 text-muted" /> Mój folder
            </Link>
            <Link href="/edytor" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-paper">
              <PenLine className="h-4 w-4 text-muted" /> Nowy dokument
            </Link>
            <form action={logout}>
              <button type="submit" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-red-700 hover:bg-red-50">
                <LogOut className="h-4 w-4" /> Wyloguj się
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
