import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm, AuthShell } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Rejestracja" };

export default async function RegisterPage({ searchParams }: PageProps<"/rejestracja">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  if (await getCurrentUser()) redirect(nextPath ?? "/");

  return (
    <AuthShell title="Załóż konto" subtitle="Dołącz do społeczności i publikuj swoje teksty.">
      <AuthForm mode="register" next={nextPath} />
    </AuthShell>
  );
}
