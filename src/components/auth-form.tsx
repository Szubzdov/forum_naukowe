"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login, register, type AuthState } from "@/app/actions/auth";

const inputCls =
  "mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : register,
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {mode === "register" && (
        <label className="block text-sm font-medium">
          Imię i nazwisko lub pseudonim
          <input name="name" required minLength={3} maxLength={60} defaultValue={state?.fields?.name} className={inputCls} autoComplete="name" />
          <span className="mt-1 block text-xs font-normal text-muted">Będzie widoczne jako podpis i znak wodny na Twoich dokumentach.</span>
        </label>
      )}
      <label className="block text-sm font-medium">
        E-mail
        <input name="email" type="email" required defaultValue={state?.fields?.email} className={inputCls} autoComplete="email" />
      </label>
      <label className="block text-sm font-medium">
        Hasło
        <input
          name="password"
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          className={inputCls}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-inset ring-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-[15px] font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === "login" ? "Zaloguj się" : "Załóż konto"}
      </button>

      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            Nie masz konta?{" "}
            <Link href={next ? `/rejestracja?next=${encodeURIComponent(next)}` : "/rejestracja"} className="font-medium text-brand-600 hover:underline">
              Zarejestruj się
            </Link>
          </>
        ) : (
          <>
            Masz już konto?{" "}
            <Link href={next ? `/logowanie?next=${encodeURIComponent(next)}` : "/logowanie"} className="font-medium text-brand-600 hover:underline">
              Zaloguj się
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-14 sm:py-20">
      <div className="rounded-2xl border border-line bg-white p-7 shadow-[0_12px_40px_-20px_rgba(16,24,40,0.2)] sm:p-9">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 mb-7 text-sm text-muted">{subtitle}</p>
        {children}
      </div>
    </main>
  );
}
