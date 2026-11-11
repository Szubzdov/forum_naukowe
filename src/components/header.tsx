import Link from "next/link";
import { FolderOpen, PenLine } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="print:hidden sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Forum Naukowe — strona główna">
          <Logo />
          <span className="hidden sm:block font-serif text-[19px] font-semibold tracking-tight">
            Forum Naukowe
          </span>
        </Link>

        <nav className="ml-4 hidden md:flex items-center gap-1 text-sm font-medium text-muted">
          <Link href="/" className="rounded-md px-3 py-2 hover:bg-paper hover:text-ink transition-colors">
            Wpisy
          </Link>
          {user && (
            <Link
              href="/moj-folder"
              className="rounded-md px-3 py-2 hover:bg-paper hover:text-ink transition-colors"
            >
              Mój folder
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/moj-folder"
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-paper"
                aria-label="Mój folder"
              >
                <FolderOpen className="h-5 w-5" />
              </Link>
              <Link
                href="/edytor"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 transition-colors"
              >
                <PenLine className="h-4 w-4" />
                <span className="hidden sm:inline">Napisz</span>
              </Link>
              <UserMenu name={user.name} email={user.email} />
            </>
          ) : (
            <>
              <Link
                href="/logowanie"
                className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-paper"
              >
                Zaloguj się
              </Link>
              <Link
                href="/rejestracja"
                className="inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-sm font-medium text-white hover:bg-black transition-colors"
              >
                Załóż konto
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
