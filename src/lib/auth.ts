import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const COOKIE = "fn_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  publishBlockedUntil: Date | null;
};

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(schema.sessions).values({ id: hashToken(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  }
  store.delete(COOKIE);
}

/** Zalogowany użytkownik albo null. Wynik jest współdzielony w obrębie jednego żądania. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      publishBlockedUntil: schema.users.publishBlockedUntil,
      expiresAt: schema.sessions.expiresAt,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(eq(schema.sessions.id, hashToken(token)))
    .limit(1);

  const row = rows[0];
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    publishBlockedUntil: row.publishBlockedUntil,
  };
});

export async function requireUser(nextPath?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/logowanie?next=${encodeURIComponent(nextPath)}` : "/logowanie");
  }
  return user;
}
