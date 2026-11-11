import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm, AuthShell } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Logowanie" };

export default async function LoginPage({ searchParams }: PageProps<"/logowanie">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  if (await getCurrentUser()) redirect(nextPath ?? "/");

  return (
    <AuthShell title="Witaj ponownie" subtitle="Zaloguj się, aby czytać pełne wpisy i publikować własne.">
      <AuthForm mode="login" next={nextPath} />
    </AuthShell>
  );
}
