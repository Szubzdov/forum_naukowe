"use server";

import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export type AuthState = { error?: string; fields?: Record<string, string> } | undefined;

const safeNext = (value: FormDataEntryValue | null) => {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
};

const RegisterSchema = z.object({
  name: z.string().trim().min(3, "Imię i nazwisko (lub pseudonim) musi mieć co najmniej 3 znaki.").max(60),
  email: z.email("Podaj poprawny adres e-mail.").trim().toLowerCase(),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków.").max(200),
});

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message, fields: { name: raw.name, email: raw.email } };
  }

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${parsed.data.email}`)
    .limit(1);
  if (existing.length) {
    return { error: "Konto z tym adresem e-mail już istnieje.", fields: { name: raw.name, email: raw.email } };
  }

  const [user] = await db
    .insert(schema.users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    })
    .returning({ id: schema.users.id });

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [user] = await db
    .select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(sql`lower(${schema.users.email}) = ${email}`)
    .limit(1);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Nieprawidłowy e-mail lub hasło.", fields: { email } };
  }

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
